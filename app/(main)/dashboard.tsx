import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { Attendance, AttendanceSettings } from '../../src/types';
import { formatLocalDate, formatLocalTime, minutesAfterTime } from '../../src/lib/date';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

type AttendanceOverviewStats = {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  notMarkedDays: number;
  lateCheckins: number;
};

type TodayAttendanceSummary = {
  date: string;
  category: Attendance['category'] | 'Not Marked';
};

function getMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(today),
    totalDays: today.getDate(),
  };
}

function getEffectiveStatus(record: Attendance, cutoff: string) {
  const lateMinutes = record.check_in_time
    ? minutesAfterTime(formatLocalTime(new Date(record.check_in_time)), cutoff)
    : 0;

  if (record.check_in_time && lateMinutes > 0) return 'Late';
  return record.status;
}

function isRegisterPresentDay(status: Attendance['status']) {
  return status === 'Present' || status === 'Late' || status === 'Half Day';
}

function isRegisterAbsentDay(status: Attendance['status']) {
  return status === 'Absent';
}

function latestRecordByDate(records: Attendance[]) {
  const latest = new Map<string, Attendance>();

  records.forEach((record) => {
    const existing = latest.get(record.date);
    const recordTime = new Date(record.check_in_time ?? record.created_at).getTime();
    const existingTime = existing ? new Date(existing.check_in_time ?? existing.created_at).getTime() : 0;

    if (!existing || recordTime > existingTime) {
      latest.set(record.date, record);
    }
  });

  return Array.from(latest.values());
}

function useAttendanceOverview(userId?: string) {
  return useQuery({
    queryKey: ['user-attendance-overview', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AttendanceOverviewStats> => {
      if (!userId) {
        return { totalDays: 0, presentDays: 0, absentDays: 0, notMarkedDays: 0, lateCheckins: 0 };
      }

      const { startDate, endDate, totalDays: elapsedMonthDays } = getMonthRange();

      const [attendanceResponse, settingsResponse] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('check_in_time', { ascending: false }),
        supabase
          .from('attendance_settings')
          .select('check_in_cutoff')
          .maybeSingle<Pick<AttendanceSettings, 'check_in_cutoff'>>(),
      ]);

      if (attendanceResponse.error) throw attendanceResponse.error;
      if (settingsResponse.error) throw settingsResponse.error;

      const cutoff = settingsResponse.data?.check_in_cutoff ?? '09:30:00';
      const records = latestRecordByDate((attendanceResponse.data ?? []) as Attendance[]);
      const counts = records.reduce(
        (acc, record) => {
          const status = getEffectiveStatus(record, cutoff);

          if (isRegisterPresentDay(status)) {
            acc.presentDays += 1;
          } else if (isRegisterAbsentDay(status)) {
            acc.absentDays += 1;
          }

          if (status === 'Late') {
            acc.lateCheckins += 1;
          }

          return acc;
        },
        { presentDays: 0, absentDays: 0, lateCheckins: 0 },
      );

      return {
        totalDays: counts.presentDays,
        ...counts,
        notMarkedDays: Math.max(0, elapsedMonthDays - records.length),
      };
    },
  });
}

function useTodayAttendanceSummary(userId?: string) {
  return useQuery({
    queryKey: ['user-today-attendance-summary', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<TodayAttendanceSummary> => {
      const today = formatLocalDate(new Date());
      if (!userId) return { date: today, category: 'Not Marked' };

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('check_in_time', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle<Attendance>();

      if (error) throw error;

      return {
        date: today,
        category: data?.category ?? 'Not Marked',
      };
    },
  });
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { user, session, refreshUser, signOut } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    error: statsError,
    refetch: refetchOverview,
  } = useAttendanceOverview(user?.id);
  const {
    data: todaySummary,
    isFetching: todaySummaryFetching,
    error: todaySummaryError,
    refetch: refetchTodaySummary,
  } = useTodayAttendanceSummary(user?.id);
  const overview = stats ?? { totalDays: 0, presentDays: 0, absentDays: 0, notMarkedDays: 0, lateCheckins: 0 };
  const todayDate = todaySummary?.date ?? formatLocalDate(new Date());
  const todayCategory = todaySummary?.category ?? 'Not Marked';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setSigningOut(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      const [overviewResult, todayResult] = await Promise.all([
        refetchOverview(),
        refetchTodaySummary(),
      ]);
      if (overviewResult.error) throw overviewResult.error;
      if (todayResult.error) throw todayResult.error;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh data.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Refresh failed', message);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const StatCard = ({ title, value, color }: { title: string; value: number | string; color?: string }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.secondary }]}>{title}</Text>
      <Text style={[styles.cardValue, { color: color || theme.colors.onSurface }]}>{value}</Text>
    </View>
  );

  // Derive display name from user profile or session email
  const displayName = user?.full_name || session?.user?.email?.split('@')[0] || 'Employee';
  const displayId = user?.employee_id || '---';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, opacity: refreshing || statsFetching || todaySummaryFetching ? 0.6 : 1 }]}
            onPress={handleRefresh}
            disabled={refreshing || statsFetching || todaySummaryFetching}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh dashboard data"
          >
            {refreshing || statsFetching || todaySummaryFetching ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Icon name="refresh" size={22} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, opacity: signingOut ? 0.6 : 1 }]}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            {signingOut ? (
              <ActivityIndicator color={theme.colors.error} size="small" />
            ) : (
              <Icon name="logout" size={22} color={theme.colors.error} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.greeting, { color: theme.colors.onBackground }]}>
          Welcome,
        </Text>
        <Text style={[styles.name, { color: theme.colors.onBackground }]}>
          {displayName}
        </Text>
        <Text style={[styles.employeeId, { color: theme.colors.secondary }]}>
          ID: {displayId}
        </Text>
      </View>

      <View style={[styles.todayCard, { backgroundColor: theme.colors.surface }]}>
        <View>
          <Text style={[styles.todayLabel, { color: theme.colors.secondary }]}>TODAY</Text>
          <Text style={[styles.todayDate, { color: theme.colors.onSurface }]}>{todayDate}</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.categoryText, { color: theme.colors.onSurface }]}>
            {todaySummaryFetching ? 'Syncing...' : todayCategory}
          </Text>
        </View>
      </View>
      {todaySummaryError ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Unable to load today's attendance category.
        </Text>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>ATTENDANCE OVERVIEW</Text>
      {statsError ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Unable to load attendance overview.
        </Text>
      ) : null}
      
      <View style={styles.row}>
        <StatCard title="Total Days" value={statsLoading ? '...' : overview.totalDays} />
        <StatCard title="Present" value={statsLoading ? '...' : overview.presentDays} color={theme.colors.primary} />
      </View>
      <View style={styles.row}>
        <StatCard title="Absent" value={statsLoading ? '...' : overview.absentDays} color={theme.colors.error} />
        <StatCard title="Late" value={statsLoading ? '...' : overview.lateCheckins} color={theme.colors.tertiary} />
      </View>
      <View style={styles.row}>
        <StatCard title="Not Marked" value={statsLoading ? '...' : overview.notMarkedDays} color={theme.colors.secondary} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 32,
    marginBottom: 8,
  },
  headerActions: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '400',
  },
  name: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 15,
  },
  todayCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  todayDate: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryBadge: {
    minWidth: 104,
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 24,
    marginBottom: 8,
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  errorText: {
    marginHorizontal: 24,
    marginBottom: 12,
    fontSize: 13,
  },
});

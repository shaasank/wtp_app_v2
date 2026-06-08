import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput as RNTextInput, Keyboard, Platform } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { LeaveType, LeaveDuration } from '../../src/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatLocalDate, parseLocalDate } from '../../src/lib/date';

interface LeaveRecord {
  id: string;
  type: string;
  duration: string;
  reason: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export default function LeaveScreen() {
  const theme = useTheme();
  
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual Leave');
  const [duration, setDuration] = useState<LeaveDuration>('Full Day');
  
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
  
  const [reason, setReason] = useState('');
  const { user, setUser, refreshUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [history, setHistory] = useState<LeaveRecord[]>([]);

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    refreshUser();

    const channel = supabase
      .channel(`profile-leave-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => setUser(payload.new as any)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves', filter: `user_id=eq.${user.id}` },
        () => {
          refreshUser();
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      if (data) setHistory(data);
    } catch (err) {
      console.warn('Error fetching leave history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const leaveTypes: LeaveType[] = ['Casual Leave', 'Sick Leave', 'Earned Leave'];
  const durations: LeaveDuration[] = ['Full Day', 'Half Day'];

  const formatHistoryDate = (date: string) => {
    return parseLocalDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentMode = showPicker;
    setShowPicker(null);
    if (selectedDate) {
      if (currentMode === 'start') {
        setStartDate(selectedDate);
        if (!isMultiDay || selectedDate > endDate) {
          setEndDate(selectedDate);
        }
      } else {
        setEndDate(selectedDate);
        if (selectedDate < startDate) {
          setStartDate(selectedDate);
        }
      }
    }
  };

  const handleApply = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setMsg('');

    try {
      if (!user) {
        throw new Error('Not authenticated');
      }

      // If duration is half day, it must be single day
      const actualIsMultiDay = duration === 'Half Day' ? false : isMultiDay;
      const finalEndDate = actualIsMultiDay ? endDate : startDate;

      const { error } = await supabase
        .from('leaves')
        .insert({
          user_id: user.id,
          type: leaveType,
          duration: duration,
          reason: reason.trim(),
          status: 'Pending',
          start_date: formatLocalDate(startDate),
          end_date: formatLocalDate(finalEndDate),
        });

      if (error) throw error;

      setMsg('Leave application submitted successfully.');
      setMsgType('success');
      setReason('');
      fetchHistory(); // Refresh history
    } catch (error) {
      console.warn('Leave submission error:', error);
      setMsg('Failed to submit leave application. Please try again.');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  const SegmentedControl = ({ 
    options, 
    selected, 
    onSelect 
  }: { 
    options: readonly string[] | readonly boolean[];
    selected: string | boolean;
    onSelect: (val: any) => void;
  }) => (
    <View style={[styles.segmentContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
      {options.map((opt) => {
        const label = typeof opt === 'boolean' ? (opt ? 'Multiple Days' : 'Single Day') : opt;
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={String(opt)}
            style={[
              styles.segmentButton, 
              isActive && {
                backgroundColor: theme.colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              },
            ]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.segmentText,
              { color: isActive ? theme.colors.onSurface : theme.colors.secondary, fontWeight: isActive ? '600' : '400' }
            ]}>
              {typeof label === 'string' ? label.split(' ')[0] : label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const StatCard = ({ title, value, color }: { title: string; value: number; color?: string }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.secondary }]}>{title}</Text>
      <Text style={[styles.cardValue, { color: color || theme.colors.onSurface }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>LEAVE BALANCE</Text>
      <View style={styles.row}>
        <StatCard title="Casual" value={user?.casual_leaves_balance ?? 0} color={theme.colors.primary} />
        <StatCard title="Sick" value={user?.sick_leaves_balance ?? 0} color={theme.colors.error} />
        <StatCard title="Earned" value={user?.earned_leaves_balance ?? 0} color={theme.colors.tertiary} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>APPLY FOR LEAVE</Text>
      
      <View style={[styles.formGroup, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.formRow, { borderBottomColor: theme.colors.outline, borderBottomWidth: 0.5 }]}>
          <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>Type</Text>
          <View style={{ width: 220 }}>
            <SegmentedControl options={leaveTypes} selected={leaveType} onSelect={setLeaveType} />
          </View>
        </View>

        <View style={[styles.formRow, { borderBottomColor: theme.colors.outline, borderBottomWidth: 0.5 }]}>
          <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>Duration</Text>
          <View style={{ width: 180 }}>
            <SegmentedControl options={durations} selected={duration} onSelect={(val) => {
              setDuration(val);
              if (val === 'Half Day') setIsMultiDay(false);
            }} />
          </View>
        </View>

        {duration === 'Full Day' && (
          <View style={[styles.formRow, { borderBottomColor: theme.colors.outline, borderBottomWidth: 0.5 }]}>
            <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>Date Mode</Text>
            <View style={{ width: 220 }}>
              <SegmentedControl options={[false, true]} selected={isMultiDay} onSelect={setIsMultiDay} />
            </View>
          </View>
        )}

        <View style={[styles.formRow, { borderBottomColor: theme.colors.outline, borderBottomWidth: 0.5 }]}>
          <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>{isMultiDay ? 'Start Date' : 'Date'}</Text>
          <TouchableOpacity onPress={() => setShowPicker('start')}>
            <Text style={{ fontSize: 17, color: theme.colors.primary }}>
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {isMultiDay && duration === 'Full Day' && (
          <View style={[styles.formRow, { borderBottomColor: theme.colors.outline, borderBottomWidth: 0.5 }]}>
            <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>End Date</Text>
            <TouchableOpacity onPress={() => setShowPicker('end')}>
              <Text style={{ fontSize: 17, color: theme.colors.primary }}>
                {endDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showPicker && (
          <DateTimePicker
            value={showPicker === 'start' ? startDate : endDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        <View style={[styles.formRow, { alignItems: 'flex-start', paddingVertical: 12 }]}>
          <RNTextInput
            placeholder="Reason for leave (optional)"
            placeholderTextColor={theme.colors.secondary}
            value={reason}
            onChangeText={(text) => { setReason(text); if (msg) setMsg(''); }}
            multiline
            style={{ flex: 1, fontSize: 17, color: theme.colors.onSurface, minHeight: 60 }}
          />
        </View>
      </View>

      {msg ? (
        <Text style={[styles.msgText, { color: msgType === 'success' ? theme.colors.primary : theme.colors.error }]}>
          {msg}
        </Text>
      ) : null}

      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
        onPress={handleApply}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Text style={[styles.actionText, { color: theme.colors.onPrimary }]}>Submit Application</Text>
        )}
      </TouchableOpacity>


      <Text style={[styles.sectionTitle, { color: theme.colors.secondary, marginTop: 32 }]}>RECENT APPLICATIONS</Text>
      
      <View style={[styles.historyGroup, { backgroundColor: theme.colors.surface }]}>
        {historyLoading && history.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : history.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: theme.colors.secondary }}>No recent applications</Text>
          </View>
        ) : (
          history.map((record, index) => (
            <View 
              key={record.id} 
              style={[
                styles.historyRow, 
                index !== history.length - 1 && { borderBottomColor: theme.colors.outline, borderBottomWidth: 0.5 }
              ]}
            >
              <View>
                <Text style={{ fontSize: 17, color: theme.colors.onSurface, fontWeight: '500' }}>
                  {record.type.split(' ')[0]} ({record.duration})
                </Text>
                <Text style={{ fontSize: 13, color: theme.colors.secondary, marginTop: 2 }}>
                  {record.start_date === record.end_date 
                    ? formatHistoryDate(record.start_date)
                    : `${formatHistoryDate(record.start_date)} - ${formatHistoryDate(record.end_date)}`}
                </Text>
              </View>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: record.status === 'Approved' ? '#E8F5E9' : record.status === 'Rejected' ? '#FFEBEE' : '#FFF3E0' }
              ]}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '600',
                  color: record.status === 'Approved' ? '#2E7D32' : record.status === 'Rejected' ? '#C62828' : '#EF6C00' 
                }}>
                  {record.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
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
  formGroup: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 52,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
  },
  msgText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  actionButton: {
    marginHorizontal: 16,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '600',
  },
  historyGroup: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  }
});

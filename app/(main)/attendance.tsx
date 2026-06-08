import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { AttendanceSettings, WorkCategory } from '../../src/types';
import { formatLocalDate, formatLocalTime, minutesAfterTime } from '../../src/lib/date';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Safe import for expo-location (not available on web in some configs)
let Location: typeof import('expo-location') | null = null;
try {
  Location = require('expo-location');
} catch {
  // Location not available
}

export default function AttendanceScreen() {
  const theme = useTheme();
  const { user, selectedCategory, setSelectedCategory } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [showTick, setShowTick] = useState(false);

  // Animation values (built-in RN Animated — no TurboModule required)
  const tickScale = useRef(new Animated.Value(0)).current;
  const tickOpacity = useRef(new Animated.Value(0)).current;

  const categories: WorkCategory[] = ['Field', 'Mill', 'Office'];

  React.useEffect(() => {
    checkTodayAttendance();
  }, [user]);

  const checkTodayAttendance = async () => {
    if (!user) return;
    try {
      const today = formatLocalDate(new Date());
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
        
      if (data) {
        if (data.check_out_time) {
          setIsCheckedIn(false);
          setHasCompletedToday(true);
          setCheckOutTime(new Date(data.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setIsCheckedIn(true);
        }
        setAttendanceId(data.id);
        setSelectedCategory(data.category as WorkCategory);
        if (data.check_in_time) {
          const time = new Date(data.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setCheckInTime(time);
        }
      }
    } catch (err) {
      // No attendance yet today
    }
  };

  const playTickAnimation = () => {
    setShowTick(true);
    tickScale.setValue(0);
    tickOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(tickOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(tickScale, { toValue: 1, damping: 12, stiffness: 100, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(tickOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setShowTick(false);
          tickScale.setValue(0);
        });
      }, 1500);
    });
  };

  const animatedTickStyle = {
    opacity: tickOpacity,
    transform: [{ scale: tickScale }],
  };

  const animatedBgStyle = {
    opacity: tickOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.85], // Dark semi-transparent or plain black look
    }),
  };

  const handleCheckIn = async () => {
    if (!selectedCategory) {
      setLocationMsg('Please select a work category first.');
      return;
    }
    
    setLoading(true);
    setLocationMsg('Fetching location...');

    try {
      if (!user) throw new Error('Not authenticated');

      let lat = null;
      let lng = null;

      try {
        if (Location) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            // Fast Check-In: First try to get the last known position to be extremely fast.
            let location = await Location.getLastKnownPositionAsync();
            
            // If we have no cached location, get the current one but timeout after 3 seconds.
            if (!location) {
              const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
              const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
              location = (await Promise.race([locationPromise, timeoutPromise])) as any;
            }
            
            if (location) {
              lat = location.coords.latitude;
              lng = location.coords.longitude;
            }
          }
        }
      } catch (locErr) {
        console.warn('Failed to fetch location:', locErr);
        // Continue checking in without location if it fails
      }

      const now = new Date();
      const localTime = formatLocalTime(now);
      const { data: settings } = await supabase
        .from('attendance_settings')
        .select('check_in_cutoff')
        .single<Pick<AttendanceSettings, 'check_in_cutoff'>>();

      const cutoff = settings?.check_in_cutoff ?? '09:30:00';
      const lateMinutes = minutesAfterTime(localTime, cutoff);
      const attendanceStatus = lateMinutes > 0 ? 'Late' : 'Present';
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          category: selectedCategory,
          check_in_time: now.toISOString(),
          location_lat: lat,
          location_lng: lng,
          status: attendanceStatus,
          late_minutes: lateMinutes,
          date: formatLocalDate(now)
        })
        .select()
        .single();

      if (error) throw error;

      setAttendanceId(data.id);
      setCheckInTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setIsCheckedIn(true);
      setLocationMsg(lat ? `Checked in at ${lat.toFixed(4)}, ${lng?.toFixed(4)}` : 'Checked in (location unavailable)');
      
      // Play the success tick animation
      playTickAnimation();
    } catch (error: any) {
      console.error('Check-in error details:', error);
      const message = error?.message || (typeof error === 'string' ? error : 'Unknown error');
      setLocationMsg(`Error checking in: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      if (!attendanceId) throw new Error('No active attendance record found');

      const now = new Date();
      const { error } = await supabase
        .from('attendance')
        .update({ check_out_time: now.toISOString() })
        .eq('id', attendanceId);

      if (error) throw error;

      setIsCheckedIn(false);
      setHasCompletedToday(true);
      setCheckOutTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setLocationMsg('Checked out successfully.');
    } catch (error) {
      console.warn('Checkout error:', error);
      setLocationMsg('Failed to check out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>WORK CATEGORY</Text>
      
      <View style={[styles.segmentContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
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
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.segmentText,
                { color: isActive ? theme.colors.onSurface : theme.colors.secondary, fontWeight: isActive ? '600' : '400' }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary, marginTop: 32 }]}>TODAY'S ATTENDANCE</Text>
      
      <View style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}>
        {checkInTime ? (
          <>
            <View style={styles.statusRow}>
              <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>Checked In</Text>
              <Text style={{ fontSize: 17, color: theme.colors.secondary }}>{checkInTime}</Text>
            </View>
            {hasCompletedToday && checkOutTime && (
              <View style={[styles.statusRow, { borderTopWidth: 0.5, borderTopColor: theme.colors.outline }]}>
                <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>Checked Out</Text>
                <Text style={{ fontSize: 17, color: theme.colors.secondary }}>{checkOutTime}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.statusRow}>
            <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>Status</Text>
            <Text style={{ fontSize: 17, color: theme.colors.secondary }}>Not Marked</Text>
          </View>
        )}
      </View>

      {locationMsg ? (
        <Text style={[styles.msgText, { color: theme.colors.secondary }]}>{locationMsg}</Text>
      ) : null}

      <View style={styles.actionContainer}>
        {hasCompletedToday ? (
          <View style={[styles.actionButton, { backgroundColor: theme.colors.surfaceVariant, opacity: 0.8 }]}>
            <Text style={[styles.actionText, { color: theme.colors.secondary }]}>Completed for Today</Text>
          </View>
        ) : !isCheckedIn ? (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              { backgroundColor: theme.colors.primary, opacity: (!selectedCategory || loading) ? 0.6 : 1 }
            ]}
            onPress={handleCheckIn}
            disabled={loading || !selectedCategory}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={[styles.actionText, { color: theme.colors.onPrimary }]}>Check In</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.error, opacity: loading ? 0.6 : 1 }]}
            onPress={handleCheckOut}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onError} />
            ) : (
              <Text style={[styles.actionText, { color: theme.colors.onError }]}>Check Out</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>

      {showTick && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }, animatedBgStyle]} />
          <Animated.View style={[styles.tickOverlay, animatedTickStyle]}>
            <View style={styles.tickCircle}>
              <Icon name="check" size={80} color="#fff" />
            </View>
            <Text style={styles.tickText}>Checked In!</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 24,
    marginBottom: 8,
    marginTop: 24,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 2,
    borderRadius: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 15,
  },
  statusCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  msgText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 13,
    paddingHorizontal: 24,
  },
  actionContainer: {
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    width: 200,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '600',
  },
  tickOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tickCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#34C759', // Apple green
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tickText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  }
});

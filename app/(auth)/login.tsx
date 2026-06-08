import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../src/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const theme = useTheme();

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both Email and Password.');
      return;
    }

    // Basic email format check
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        // User-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('Incorrect email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMsg('Please verify your email address first.');
        } else {
          setErrorMsg(error.message);
        }
      }
    } catch (err) {
      setErrorMsg('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: theme.colors.background }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.formContainer}>
          <View style={styles.header}>
            <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onBackground }]}>
              WorkTrackPro
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.secondary }]}>
              Sign in to manage your attendance.
            </Text>
          </View>

          <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <TextInput
              placeholder="Email Address"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrorMsg(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              style={[styles.input, { backgroundColor: 'transparent' }]}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              textColor={theme.colors.onSurface}
              placeholderTextColor={theme.colors.secondary}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={(text) => { setPassword(text); setErrorMsg(''); }}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              style={[styles.input, { backgroundColor: 'transparent' }]}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              textColor={theme.colors.onSurface}
              placeholderTextColor={theme.colors.secondary}
            />
          </View>

          {errorMsg ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMsg}</Text>
          ) : null}

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  inputGroup: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 24,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 17,
  },
  divider: {
    height: 0.5,
    width: '100%',
    marginLeft: 16,
  },
  button: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 15,
  },
});

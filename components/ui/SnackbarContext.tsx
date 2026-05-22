import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Default navigation header height
const HEADER_HEIGHT = 56;

interface SnackbarContextType {
  showSnackbar: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('info');

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideSnackbar = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [translateY, opacity]);

  const segments = useSegments() as string[];

  // Determine if the current screen likely has a header
  // Logic: 
  // 1. Must be in (tabs)
  // 2. Must NOT be 'profile' (headerless)
  // 3. If in 'home', must NOT be the index (root)
  const inTabs = segments[0] === '(tabs)';
  const inHomeStack = inTabs && segments[1] === 'home';
  const isHomeIndex = inHomeStack && (segments.length === 2 || segments[2] === 'index');
  const isProfile = inTabs && segments[1] === 'profile';

  const hasHeader = inTabs && !isProfile && !isHomeIndex;

  const showSnackbar = useCallback((msg: string, snackType: 'success' | 'error' | 'info' = 'info') => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setMessage(msg);
    setType(snackType);
    setVisible(true);

    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 3 seconds
    hideTimeoutRef.current = setTimeout(() => {
      hideSnackbar();
    }, 3000);
  }, [translateY, opacity, hideSnackbar]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
          iconName: 'checkmark-circle' as const,
          iconColor: theme.colors.onSurface,
          textColor: theme.colors.onSurface,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.errorContainer,
          borderColor: theme.colors.error,
          iconName: 'alert-circle' as const,
          iconColor: theme.colors.error,
          textColor: theme.colors.onErrorContainer,
        };
      default:
        return {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outline,
          iconName: 'information-circle' as const,
          iconColor: theme.colors.primary,
          textColor: theme.colors.onSurfaceVariant,
        };
    }
  };

  const config = getConfig();

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top + (hasHeader ? HEADER_HEIGHT : 0) + 8,
              transform: [{ translateY }],
              opacity,
            }
          ]}
        >
          <Pressable onPress={hideSnackbar}>
            <View
              style={[
                styles.snackbar,
                {
                  backgroundColor: config.backgroundColor,
                  borderColor: config.borderColor,
                }
              ]}
            >
              <Ionicons name={config.iconName} size={22} color={config.iconColor} style={styles.icon} />
              <Text style={[styles.text, { color: config.textColor }]} numberOfLines={2}>
                {message}
              </Text>
              <Ionicons name="close" size={18} color={config.textColor} style={styles.closeIcon} />
            </View>
          </Pressable>
        </Animated.View>
      )}
    </SnackbarContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    marginRight: 12,
  },
  closeIcon: {
    marginLeft: 8,
    opacity: 0.6,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

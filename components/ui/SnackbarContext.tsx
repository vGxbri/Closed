/**
 * Contexto de snackbar
 * Proveedor global de notificaciones breves de éxito, error o info.
 * En iOS 26+ el aviso es Liquid Glass; en el resto, una superficie opaca.
 */

import { Ionicons } from '@expo/vector-icons';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSegments } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 56;

// Los errores se quedan más tiempo: hay que leerlos y entender qué corregir
const DURATION_MS = 3000;
const ERROR_DURATION_MS = 5000;

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
// Con cristal no se puede animar la opacidad, así que el aviso entra desde fuera de la pantalla
const HIDDEN_Y = glassAvailable ? -220 : -100;

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

  const [translateY] = useState(() => new Animated.Value(HIDDEN_Y));
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideSnackbar = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: HIDDEN_Y,
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

  // Posición del snackbar: en (tabs) con cabecera, excepto perfil y home raíz
  const inTabs = segments[0] === '(tabs)';
  const inHomeStack = inTabs && segments[1] === 'home';
  const isHomeIndex = inHomeStack && (segments.length === 2 || segments[2] === 'index');
  const isProfile = inTabs && segments[1] === 'profile';

  const hasHeader = inTabs && !isProfile && !isHomeIndex;

  const showSnackbar = useCallback((msg: string, snackType: 'success' | 'error' | 'info' = 'info') => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setMessage(msg);
    setType(snackType);
    setVisible(true);

    // El aviso es visual y desaparece solo: el lector de pantalla lo lee en voz alta
    AccessibilityInfo.announceForAccessibility(msg);

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

    hideTimeoutRef.current = setTimeout(() => {
      hideSnackbar();
    }, snackType === 'error' ? ERROR_DURATION_MS : DURATION_MS);
  }, [translateY, opacity, hideSnackbar]);

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
        return { iconName: 'checkmark-circle' as const, color: theme.colors.primary };
      case 'error':
        return { iconName: 'alert-circle' as const, color: theme.colors.error };
      default:
        return { iconName: 'information-circle' as const, color: theme.colors.onSurfaceVariant };
    }
  };

  const config = getConfig();

  const content = (
    <>
      <View style={[styles.iconChip, { backgroundColor: `${config.color}1F` }]}>
        <Ionicons name={config.iconName} size={18} color={config.color} />
      </View>
      <Text style={[styles.text, { color: theme.colors.onSurface }]} numberOfLines={2}>
        {message}
      </Text>
    </>
  );

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.container,
            {
              top: insets.top + (hasHeader ? HEADER_HEIGHT : 0) + 8,
              transform: [{ translateY }],
            },
            !glassAvailable && { opacity },
          ]}
        >
          <Pressable onPress={hideSnackbar} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {glassAvailable ? (
              <GlassView style={styles.snackbar} glassEffectStyle="regular">
                {content}
              </GlassView>
            ) : (
              <View
                style={[
                  styles.snackbar,
                  styles.snackbarSolid,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  }
                ]}
              >
                {content}
              </View>
            )}
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
    alignItems: 'center',
    zIndex: 9999,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    paddingVertical: 9,
    paddingLeft: 9,
    paddingRight: 18,
    borderRadius: 24,
  },
  snackbarSolid: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flexShrink: 1,
    fontFamily: 'Archivo-Medium',
    fontSize: 14,
    lineHeight: 19,
  },
});

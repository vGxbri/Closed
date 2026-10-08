/**
 * Altura del teclado
 * Altura que el teclado ocupa en pantalla, animada a su mismo ritmo, para anclar controles encima.
 */

import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

// Solo iOS: KeyboardAvoidingView mide mal cuando no empieza en lo alto de la pantalla
// y Android ya redimensiona la ventana por su cuenta.
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const subscription = Keyboard.addListener(
      "keyboardWillChangeFrame",
      (event) => {
        Keyboard.scheduleLayoutAnimation(event);
        setKeyboardHeight(
          Math.max(
            0,
            Dimensions.get("window").height - event.endCoordinates.screenY,
          ),
        );
      },
    );

    return () => subscription.remove();
  }, []);

  return keyboardHeight;
}

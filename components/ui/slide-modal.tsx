import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, StyleSheet } from "react-native";

export interface SlideModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  children: React.ReactNode;
  /** Side the modal slides in from. Defaults to "right". */
  direction?: "right" | "left";
  /** Enter animation duration (ms). Defaults to 280. */
  enterDuration?: number;
  /** Exit animation duration (ms). Defaults to 240. */
  exitDuration?: number;
}

/**
 * Full-screen modal that animates in/out horizontally instead of vertically.
 * Wraps RN's Modal with a translucent background and an Animated.View that
 * slides its children on/off-screen.
 */
export function SlideModal({
  visible,
  onRequestClose,
  children,
  direction = "right",
  enterDuration = 280,
  exitDuration = 240,
}: SlideModalProps) {
  const width = Dimensions.get("window").width;
  const offscreen = direction === "right" ? width : -width;
  const translateX = useRef(new Animated.Value(visible ? 0 : offscreen)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateX.setValue(offscreen);
      Animated.timing(translateX, {
        toValue: 0,
        duration: enterDuration,
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      Animated.timing(translateX, {
        toValue: offscreen,
        duration: exitDuration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

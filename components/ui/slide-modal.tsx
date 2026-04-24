import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, StyleSheet } from "react-native";

export interface SlideModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  children: React.ReactNode;
  animation?: "slide" | "fade";
  direction?: "right" | "left";
  enterDuration?: number;
  exitDuration?: number;
}

export function SlideModal({
  visible,
  onRequestClose,
  children,
  animation = "slide",
  direction = "right",
  enterDuration = 280,
  exitDuration = 200,
}: SlideModalProps) {
  const width = Dimensions.get("window").width;
  const offscreen = direction === "right" ? width : -width;

  const translateX = useRef(
    new Animated.Value(animation === "slide" ? (visible ? 0 : offscreen) : 0),
  ).current;
  const opacity = useRef(
    new Animated.Value(animation === "fade" ? (visible ? 1 : 0) : 1),
  ).current;

  const [rendered, setRendered] = useState(visible);
  const renderedRef = useRef(visible);

  useEffect(() => {
    if (visible) {
      renderedRef.current = true;
      setRendered(true);
      if (animation === "slide") {
        translateX.setValue(offscreen);
        Animated.timing(translateX, {
          toValue: 0,
          duration: enterDuration,
          useNativeDriver: true,
        }).start();
      } else {
        opacity.setValue(0);
        Animated.timing(opacity, {
          toValue: 1,
          duration: enterDuration,
          useNativeDriver: true,
        }).start();
      }
    } else if (renderedRef.current) {
      if (animation === "slide") {
        Animated.timing(translateX, {
          toValue: offscreen,
          duration: exitDuration,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            renderedRef.current = false;
            setRendered(false);
          }
        });
      } else {
        Animated.timing(opacity, {
          toValue: 0,
          duration: exitDuration,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            renderedRef.current = false;
            setRendered(false);
          }
        });
      }
    }
  }, [
    visible,
    animation,
    enterDuration,
    exitDuration,
    offscreen,
    opacity,
    translateX,
  ]);

  const animatedStyle =
    animation === "slide" ? { transform: [{ translateX }] } : { opacity };

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        {children}
      </Animated.View>
    </Modal>
  );
}

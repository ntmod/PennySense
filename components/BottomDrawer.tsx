import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

interface BottomDrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  children?: React.ReactNode;
}

export default function BottomDrawer({
  visible,
  onClose,
  title = "Details",
  children,
}: BottomDrawerProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const screenHeight = Dimensions.get("window").height;

  const closeDrawer = () => {
    Animated.timing(pan, {
      toValue: { x: 0, y: screenHeight },
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow dragging down
          Animated.event([null, { dy: pan.y }], { useNativeDriver: false })(
            e,
            gestureState
          );
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeDrawer();
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      pan.setValue({ x: 0, y: screenHeight });
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={closeDrawer}
    >
      <TouchableOpacity
        className="flex-1 bg-black/30 justify-end"
        activeOpacity={1}
        onPress={closeDrawer}
      >
        <TouchableWithoutFeedback>
          <Animated.View
            className="bg-white w-full rounded-t-3xl h-[95%] p-6 shadow-2xl"
            style={{ transform: [{ translateY: pan.y }] }}
          >
            {/* Drawer Handle */}
            <View
              className="items-center mb-4 py-2"
              {...panResponder.panHandlers}
            >
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            {/* Drawer Header */}
            {/* <View className="flex-row justify-between items-center mb-6">
              {typeof title === "string" ? (
                <Text className="text-xl font-chakra-bold text-gray-900">
                  {title}
                </Text>
              ) : (
                title
              )}
              <TouchableOpacity onPress={closeDrawer}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View> */}

            {/* Content */}
            <View className="flex-1">{children}</View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

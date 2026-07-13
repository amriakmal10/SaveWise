import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";

export default function LoadingScreen() {
  const drift1 = useRef(new Animated.Value(0)).current;
  const drift2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    loop(drift1, 4000).start();
    loop(drift2, 5500).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const bubble1Translate = drift1.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const bubble2Translate = drift2.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <View className="flex-1 bg-navy items-center justify-center">
      <Animated.View
        className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/5"
        style={{ transform: [{ translateY: bubble1Translate }] }}
      />
      <Animated.View
        className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-white/5"
        style={{ transform: [{ translateY: bubble2Translate }] }}
      />
      <Animated.View
        className="absolute top-1/3 right-10 w-20 h-20 rounded-full bg-white/5"
        style={{ transform: [{ translateY: bubble1Translate }] }}
      />

      <Animated.Text
        className="text-white text-4xl font-bold"
        style={{ transform: [{ scale: pulse }] }}
      >
        SaveWise
      </Animated.Text>
      <Text className="text-white/60 mt-2">Save smarter, every purchase</Text>
    </View>
  );
}
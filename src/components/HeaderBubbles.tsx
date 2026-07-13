import React from "react";
import { View } from "react-native";


export default function HeaderBubbles() {
  return (
    <>
      <View className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/10" />
      <View className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-white/10" />
      <View className="absolute top-4 left-20 w-20 h-20 rounded-full bg-white/10" />
    </>
  );
}
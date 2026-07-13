import React from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { ChevronLeft, Check } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

const FEATURES = [
  "Round-Up Savings",
  "Savings Goals",
  "QR Transaction Tracking",
  "Stellar Integration",
];

export default function AboutScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="flex-row items-center px-6 pt-14 pb-4">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <ChevronLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-navy">About</Text>
      </View>

      <View className="items-center px-8 mt-4">
        <View className="w-20 h-20 rounded-3xl bg-navy items-center justify-center mb-4">
          <Image
            source={require("../../assets/logo.png")}
            className="w-11 h-11"
            resizeMode="contain"
          />
        </View>

        <Text className="text-2xl font-extrabold text-navy">SaveWise</Text>
        <Text className="text-gray-500 mt-1">Smart Savings Made Simple</Text>
        <Text className="text-gray-400 text-sm mt-1">Version 1.0.0</Text>

        <Text className="text-gray-600 text-center mt-6 leading-relaxed">
          SaveWise helps users develop better saving habits through smart round-up
          savings and Stellar blockchain technology.
        </Text>

        <View className="w-full mt-8">
          <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3">
            FEATURES
          </Text>
          <View className="bg-gray-50 rounded-2xl p-4 gap-3">
            {FEATURES.map((feature) => (
              <View key={feature} className="flex-row items-center">
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center mr-3">
                  <Check size={12} color="#fff" />
                </View>
                <Text className="text-gray-800">{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="w-full mt-8 items-center">
          <Text className="text-xs font-bold text-gray-400 tracking-wide mb-2">
            POWERED BY
          </Text>
          <Text className="text-gray-600 text-sm">Stellar · Soroban · Supabase</Text>
        </View>

        <Text className="text-gray-400 text-xs mt-8">© 2026 SaveWise</Text>
      </View>
    </ScrollView>
  );
}
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { X, Delete } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { getPasscodeHashKey } from "../utils/passcodeConstants";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

const PASSCODE_LENGTH = 6;

// Rendered on top of MainNavigator whenever the app is locked. Blurs
// whatever's behind it (Home etc.) and shows a centered modal card with
// the passcode keypad, rather than swapping to a separate full route.
export default function PasscodeOverlay() {
  const { unlock, lock } = useAuth();
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDigitPress = async (digit: string) => {
    setError(null);
    const next = entry + digit;
    if (next.length > PASSCODE_LENGTH) return;
    setEntry(next);

    if (next.length === PASSCODE_LENGTH) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const storedHash = await SecureStore.getItemAsync(getPasscodeHashKey(user.id));
      const enteredHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        next
      );

      if (enteredHash === storedHash) {
        unlock();
      } else {
        setError("Incorrect passcode. Try again.");
        setTimeout(() => {
          setEntry("");
          setError(null);
        }, 700);
      }
    }
  };

  const handleDelete = () => setEntry((v) => v.slice(0, -1));

  // No dedicated "close" destination exists above a locked app — the
  // safest fallback is signing out entirely, dropping back to Sign In.
  const handleClose = async () => {
    await supabase.auth.signOut();
    lock();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={60}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 items-center justify-center px-6">
        <View className="bg-white rounded-3xl w-full max-w-sm p-6 items-center">
          <Pressable
            onPress={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
          >
            <X size={16} color="#374151" />
          </Pressable>

          <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center mb-4 mt-2">
            <Text style={{ fontSize: 30 }}>🔑</Text>
          </View>

          <Text className="text-xl font-bold text-navy">Passcode</Text>
          <Text className="text-gray-400 mt-1 mb-5">Please enter 6-digit passcode</Text>

          <View className="flex-row gap-3 mb-2">
            {Array.from({ length: PASSCODE_LENGTH }).map((_, i) => (
              <View
                key={i}
                className={`w-3.5 h-3.5 rounded-full border-2 ${
                  i < entry.length ? "bg-primary border-primary" : "bg-white border-gray-300"
                }`}
              />
            ))}
          </View>

          {error && <Text className="text-red-500 text-sm mt-2">{error}</Text>}

          <View className="mt-6 w-full">
            {[
              ["1", "2", "3"],
              ["4", "5", "6"],
              ["7", "8", "9"],
            ].map((row, i) => (
              <View key={i} className="flex-row justify-between mb-3">
                {row.map((digit) => (
                  <Pressable
                    key={digit}
                    onPress={() => handleDigitPress(digit)}
                    className="w-[30%] h-14 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
                  >
                    <Text className="text-xl font-semibold text-gray-900">{digit}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            <View className="flex-row justify-between">
              <View className="w-[30%] h-14" />
              <Pressable
                onPress={() => handleDigitPress("0")}
                className="w-[30%] h-14 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Text className="text-xl font-semibold text-gray-900">0</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                className="w-[30%] h-14 rounded-2xl items-center justify-center active:bg-gray-100"
              >
                <Delete size={20} color="#374151" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
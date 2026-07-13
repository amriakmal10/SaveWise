import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Lock, Delete } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { getPasscodeHashKey, getHasPasscodeKey } from "../../utils/passcodeConstants";
import { supabase } from "../../services/supabase";

type Props = NativeStackScreenProps<AuthStackParamList, "PasscodeSetup">;

const PASSCODE_LENGTH = 6;

export default function PasscodeSetupScreen({ navigation }: Props) {
  const { unlock, refreshPasscodeFlag } = useAuth();
  const [stage, setStage] = useState<"create" | "confirm">("create");
  const [firstEntry, setFirstEntry] = useState("");
  const [currentEntry, setCurrentEntry] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeValue = stage === "create" ? firstEntry : currentEntry;

  const handleDigitPress = async (digit: string) => {
    setError(null);
    const next = activeValue + digit;
    if (next.length > PASSCODE_LENGTH) return;

    if (stage === "create") {
      setFirstEntry(next);
      if (next.length === PASSCODE_LENGTH) {
        setTimeout(() => setStage("confirm"), 150);
      }
    } else {
      setCurrentEntry(next);
      if (next.length === PASSCODE_LENGTH) {
        if (next === firstEntry) {
          await savePasscode(next);
        } else {
          setError("Passcodes don't match. Try again.");
          setTimeout(() => {
            setCurrentEntry("");
            setError(null);
          }, 700);
        }
      }
    }
  };

  const handleDelete = () => {
    if (stage === "create") {
      setFirstEntry((v) => v.slice(0, -1));
    } else {
      setCurrentEntry((v) => v.slice(0, -1));
    }
  };

  const savePasscode = async (code: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      code
    );
    await SecureStore.setItemAsync(getPasscodeHashKey(user.id), hash);
    await SecureStore.setItemAsync(getHasPasscodeKey(user.id), "true");
    await refreshPasscodeFlag(user.id);
    // User is already authenticated from signup — unlock straight into
    // the main app instead of bouncing back through Sign In.
    unlock();
  };

  return (
    <View className="flex-1 bg-white items-center px-8">
      <View className="items-center mt-24 mb-10">
        <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
          <Lock size={28} color="#fff" />
        </View>
        <Text className="text-2xl font-bold text-gray-900">
          {stage === "create" ? "Create Passcode" : "Confirm Passcode"}
        </Text>
        <Text className="text-gray-500 mt-1 text-center">
          {stage === "create"
            ? "Set a 6-digit passcode for quick access"
            : "Re-enter your passcode to confirm"}
        </Text>
      </View>

      {/* Dots */}
      <View className="flex-row gap-3 mb-2">
        {Array.from({ length: PASSCODE_LENGTH }).map((_, i) => (
          <View
            key={i}
            className={`w-4 h-4 rounded-full border-2 ${
              i < activeValue.length
                ? "bg-primary border-primary"
                : "bg-white border-gray-300"
            }`}
          />
        ))}
      </View>

      {error && <Text className="text-red-500 text-sm mt-3">{error}</Text>}

      {/* Keypad */}
      <View className="mt-14 w-full">
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
        ].map((row, i) => (
          <View key={i} className="flex-row justify-between mb-4">
            {row.map((digit) => (
              <Pressable
                key={digit}
                onPress={() => handleDigitPress(digit)}
                className="w-20 h-16 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Text className="text-xl font-semibold text-gray-900">{digit}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View className="flex-row justify-between">
          <View className="w-20 h-16" />
          <Pressable
            onPress={() => handleDigitPress("0")}
            className="w-20 h-16 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
          >
            <Text className="text-xl font-semibold text-gray-900">0</Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            className="w-20 h-16 rounded-2xl items-center justify-center active:bg-gray-100"
          >
            <Delete size={22} color="#374151" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
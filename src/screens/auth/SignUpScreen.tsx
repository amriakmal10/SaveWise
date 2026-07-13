import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, User, ShieldCheck, Phone, MapPin, Lock, Eye, EyeOff } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/types";
import { supabase } from "../../services/supabase";
import * as SecureStore from "expo-secure-store";
import { generateWallet, fundTestnetAccount } from "../../services/stellar";

// ---------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------
const icRegex = /^[A-Za-z0-9-]{5,20}$/; // generic national ID: MY IC, SG NRIC, ID KTP, PH PhilID, etc.
// General international phone format: optional +, country code, 8-15 digits total.
// Covers ASEAN countries (MY +60, SG +65, ID +62, TH +66, PH +63, VN +84, etc.)
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    username: z
      .string()
      .min(3, "Min. 3 characters")
      .max(20, "Max. 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only"),
    icNumber: z.string().regex(icRegex, "Enter a valid national ID"),
    phoneNumber: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => phoneRegex.test(val.replace(/[\s-]/g, "")), {
        message: "Enter a valid phone number with country code",
      }),
    homeAddress: z.string().min(5, "Enter your home address"),
    password: z.string().min(8, "Min. 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

export default function SignUpScreen({ navigation }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      username: "",
      icNumber: "",
      phoneNumber: "",
      homeAddress: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setSignUpError(null);
    setIsSubmitting(true);
    try {
      // No email field in this form, and no OTP/verification step wanted —
      // Supabase Auth still technically needs an email under the hood, so we
      // derive a stable placeholder from the phone number. This requires
      // "Confirm email" to be turned OFF in Supabase (Authentication →
      // Providers → Email), otherwise the account stays unconfirmed and
      // can't sign in until a confirmation link is clicked.
      const placeholderEmail = `${data.phoneNumber.replace(/\D/g, "")}@savewise.internal`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: placeholderEmail,
        password: data.password,
      });

      if (authError) {
        setSignUpError(authError.message);
        return;
      }

      const userId = authData.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from("users").insert({
          id: userId,
          full_name: data.fullName,
          username: data.username,
          phone_number: data.phoneNumber,
          national_id: data.icNumber,
          home_address: data.homeAddress,
          email: placeholderEmail,
        });

        if (profileError) {
          setSignUpError(profileError.message);
          return;
        }

        // Create the user's Stellar wallet: generate a keypair, fund it
        // on testnet via Friendbot, save the public key to Supabase, and
        // keep the secret key device-local in SecureStore (never sent
        // to the server in plaintext).
        try {
          const wallet = generateWallet();
          await fundTestnetAccount(wallet.publicKey);

          const { error: walletError } = await supabase.from("wallets").insert({
            user_id: userId,
            stellar_public_key: wallet.publicKey,
            is_funded: true,
          });

          if (walletError) {
            // Non-fatal: the account exists, but we couldn't record the
            // wallet row. Surfacing this quietly rather than blocking
            // sign-up entirely — the user already has an account.
            console.warn("Wallet row insert failed:", walletError.message);
          } else {
            await SecureStore.setItemAsync(`stellar_secret_${userId}`, wallet.secretKey);
          }
        } catch (walletErr) {
          console.warn("Wallet creation/funding failed:", walletErr);
          // Don't block account creation over a testnet funding hiccup —
          // this can be retried later once the wallet module has a
          // "create wallet" fallback path.
        }
      }

      // Account created — move to passcode setup so returning users can
      // unlock with a 6-digit code instead of full email/password login.
      navigation.navigate("PasscodeSetup");
    } catch (err) {
      setSignUpError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        {/* Header */}
        <View className="flex-row items-center mt-14 mb-1">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
          >
            <ChevronLeft size={20} color="#374151" />
          </Pressable>
        </View>
        <Text className="text-2xl font-bold text-gray-900 mt-3">Create Account</Text>
        <Text className="text-gray-500 mt-1 mb-6">Fill in your details below</Text>

        <View className="gap-5">
          {/* Full Name */}
          <Field
            label="FULL NAME"
            icon={<User size={18} color="#9CA3AF" />}
            control={control}
            name="fullName"
            placeholder="e.g. Ahmad Amri bin Razali"
            error={errors.fullName?.message}
          />

          {/* Username */}
          <Field
            label="USERNAME"
            icon={<User size={18} color="#9CA3AF" />}
            control={control}
            name="username"
            placeholder="e.g. amri_hakim"
            error={errors.username?.message}
          />

          {/* National ID */}
          <Field
            label="NATIONAL ID"
            icon={<ShieldCheck size={18} color="#9CA3AF" />}
            control={control}
            name="icNumber"
            placeholder="e.g. NRIC, IC, KTP, PhilID number"
            error={errors.icNumber?.message}
          />

          {/* Phone Number */}
          <Field
            label="PHONE NUMBER"
            icon={<Phone size={18} color="#9CA3AF" />}
            control={control}
            name="phoneNumber"
            placeholder="e.g. +65 8123 4567"
            error={errors.phoneNumber?.message}
            keyboardType="phone-pad"
          />

          {/* Home Address */}
          <Field
            label="HOME ADDRESS"
            icon={<MapPin size={18} color="#9CA3AF" />}
            control={control}
            name="homeAddress"
            placeholder="e.g. No. 12, Jalan Ampang, KL"
            error={errors.homeAddress?.message}
          />

          {/* Password */}
          <View>
            <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
              PASSWORD
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14">
                  <Lock size={18} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-900"
                    placeholder="Min. 8 characters"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                  <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color="#9CA3AF" />
                    ) : (
                      <Eye size={18} color="#9CA3AF" />
                    )}
                  </Pressable>
                </View>
              )}
            />
            {errors.password && (
              <Text className="text-red-500 text-xs mt-1">{errors.password.message}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View>
            <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
              CONFIRM PASSWORD
            </Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14">
                  <Lock size={18} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-900"
                    placeholder="Re-enter password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                  <Pressable onPress={() => setShowConfirmPassword((s) => !s)} hitSlop={8}>
                    {showConfirmPassword ? (
                      <EyeOff size={18} color="#9CA3AF" />
                    ) : (
                      <Eye size={18} color="#9CA3AF" />
                    )}
                  </Pressable>
                </View>
              )}
            />
            {errors.confirmPassword && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>

          <Text className="text-xs text-gray-400 text-center px-4">
            By signing up, you agree to our{" "}
            <Text className="text-primary font-medium">Terms of Service</Text> and{" "}
            <Text className="text-primary font-medium">Privacy Policy</Text>.
          </Text>

          {signUpError && (
            <View className="bg-red-50 rounded-xl px-4 py-3">
              <Text className="text-red-600 text-sm">{signUpError}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-primary rounded-2xl h-14 items-center justify-center mt-2 mb-8 active:opacity-80"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Confirm</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------
// Reusable field component to avoid repeating Controller boilerplate
// ---------------------------------------------------------------------
function Field({
  label,
  icon,
  control,
  name,
  placeholder,
  error,
  keyboardType,
}: {
  label: string;
  icon: React.ReactNode;
  control: any;
  name: keyof SignUpFormData;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
}) {
  return (
    <View>
      <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14">
            {icon}
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={value as string}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType={keyboardType}
            />
          </View>
        )}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
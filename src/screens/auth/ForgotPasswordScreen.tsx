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
import { ChevronLeft, User, Phone, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/types";
import { supabase } from "../../services/supabase";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

const identitySchema = z.object({
  username: z.string().min(1, "Username is required"),
  phoneNumber: z.string().min(6, "Enter your phone number"),
});
type IdentityFormData = z.infer<typeof identitySchema>;

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Min. 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<"identity" | "newPassword" | "success">("identity");
  const [verifiedIdentity, setVerifiedIdentity] = useState<{
    username: string;
    phoneNumber: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---- Step 1 form ----
  const identityForm = useForm<IdentityFormData>({
    resolver: zodResolver(identitySchema),
    defaultValues: { username: "", phoneNumber: "" },
  });

  const onSubmitIdentity = async (data: IdentityFormData) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const { data: match, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", data.username)
        .eq("phone_number", data.phoneNumber)
        .maybeSingle();

      if (error || !match) {
        setFormError("No account found with that username and phone number.");
        return;
      }

      setVerifiedIdentity(data);
      setStep("newPassword");
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Step 2 form ----
  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmitNewPassword = async (data: NewPasswordFormData) => {
    if (!verifiedIdentity) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const { data: success, error } = await supabase.rpc("reset_password_by_identity", {
        p_username: verifiedIdentity.username,
        p_phone: verifiedIdentity.phoneNumber,
        p_new_password: data.password,
      });

      if (error || !success) {
        setFormError("Couldn't reset your password. Please try again.");
        return;
      }

      setStep("success");
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
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

        {step === "identity" && (
          <>
            <Text className="text-2xl font-bold text-gray-900 mt-3">Forgot Password</Text>
            <Text className="text-gray-500 mt-1 mb-6">
              Enter your username and phone number to continue
            </Text>

            <View className="gap-5">
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
                  USERNAME
                </Text>
                <Controller
                  control={identityForm.control}
                  name="username"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14">
                      <User size={18} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900"
                        placeholder="e.g. amri_hakim"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                  )}
                />
                {identityForm.formState.errors.username && (
                  <Text className="text-red-500 text-xs mt-1">
                    {identityForm.formState.errors.username.message}
                  </Text>
                )}
              </View>

              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
                  PHONE NUMBER
                </Text>
                <Controller
                  control={identityForm.control}
                  name="phoneNumber"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14">
                      <Phone size={18} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900"
                        placeholder="e.g. +65 8123 4567"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                  )}
                />
                {identityForm.formState.errors.phoneNumber && (
                  <Text className="text-red-500 text-xs mt-1">
                    {identityForm.formState.errors.phoneNumber.message}
                  </Text>
                )}
              </View>

              {formError && (
                <View className="bg-red-50 rounded-xl px-4 py-3">
                  <Text className="text-red-600 text-sm">{formError}</Text>
                </View>
              )}

              <Pressable
                onPress={identityForm.handleSubmit(onSubmitIdentity)}
                disabled={isSubmitting}
                className="bg-primary rounded-2xl h-14 items-center justify-center mt-2 active:opacity-80"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Continue</Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        {step === "newPassword" && (
          <>
            <Text className="text-2xl font-bold text-gray-900 mt-3">Set New Password</Text>
            <Text className="text-gray-500 mt-1 mb-6">
              Choose a new password for your account
            </Text>

            <View className="gap-5">
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
                  NEW PASSWORD
                </Text>
                <Controller
                  control={newPasswordForm.control}
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
                {newPasswordForm.formState.errors.password && (
                  <Text className="text-red-500 text-xs mt-1">
                    {newPasswordForm.formState.errors.password.message}
                  </Text>
                )}
              </View>

              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
                  CONFIRM NEW PASSWORD
                </Text>
                <Controller
                  control={newPasswordForm.control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14">
                      <Lock size={18} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900"
                        placeholder="Re-enter new password"
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
                {newPasswordForm.formState.errors.confirmPassword && (
                  <Text className="text-red-500 text-xs mt-1">
                    {newPasswordForm.formState.errors.confirmPassword.message}
                  </Text>
                )}
              </View>

              {formError && (
                <View className="bg-red-50 rounded-xl px-4 py-3">
                  <Text className="text-red-600 text-sm">{formError}</Text>
                </View>
              )}

              <Pressable
                onPress={newPasswordForm.handleSubmit(onSubmitNewPassword)}
                disabled={isSubmitting}
                className="bg-primary rounded-2xl h-14 items-center justify-center mt-2 active:opacity-80"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Reset Password</Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        {step === "success" && (
          <View className="flex-1 items-center justify-center px-4" style={{ minHeight: 400 }}>
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-5">
              <CheckCircle2 size={32} color="#1B5E20" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center">
              Password Reset
            </Text>
            <Text className="text-gray-500 mt-2 text-center">
              Your password has been updated. Sign in with your new password.
            </Text>
            <Pressable
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "SignIn" }] })}
              className="bg-primary rounded-2xl h-14 items-center justify-center mt-8 px-10 active:opacity-80"
            >
              <Text className="text-white font-semibold text-base">Back to Sign In</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
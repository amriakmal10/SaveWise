import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/types";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import HeaderBubbles from "../../components/HeaderBubbles";

const signInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, "SignIn">;

export default function SignInScreen({ navigation }: Props) {
  const { unlock } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: SignInFormData) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
        "get_email_for_username",
        { lookup_username: data.username }
      );

      if (lookupError || !resolvedEmail) {
        setAuthError("Username or password is incorrect.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: data.password,
      });
      if (error) {
        setAuthError("Username or password is incorrect.");
        return;
      }
      unlock();
    } catch (err) {
      setAuthError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-navy overflow-hidden">
      <HeaderBubbles />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          {/* Logo */}
          <View className="items-center mt-20 mb-10">
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 88, height: 88 }}
              resizeMode="contain"
            />
            <Text className="text-white text-2xl font-bold mt-3">Welcome!</Text>
            <Text className="text-white text-3xl font-extrabold">Sign In</Text>
            <Text className="text-blue-300 mt-2">Please fill your information</Text>
          </View>

          {/* Form */}
          <View className="gap-5">
            {/* Username */}
            <View>
              <Text className="text-blue-300 text-xs font-semibold mb-2 tracking-wide uppercase">
                Username
              </Text>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    className="flex-row items-center bg-white/5 rounded-2xl px-4 h-14 border"
                    style={{
                      borderColor: focusedField === "username" ? "#3461FD" : "rgba(255,255,255,0.15)",
                    }}
                  >
                    <Mail size={18} color="#5B82FF" />
                    <TextInput
                      className="flex-1 ml-3 text-base text-white"
                      placeholder="e.g. amri_hakim"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                      }}
                    />
                  </View>
                )}
              />
              {errors.username && (
                <Text className="text-red-400 text-xs mt-1">{errors.username.message}</Text>
              )}
            </View>

            {/* Password */}
            <View>
              <Text className="text-blue-300 text-xs font-semibold mb-2 tracking-wide uppercase">
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    className="flex-row items-center bg-white/5 rounded-2xl px-4 h-14 border"
                    style={{
                      borderColor: focusedField === "password" ? "#3461FD" : "rgba(255,255,255,0.15)",
                    }}
                  >
                    <Lock size={18} color="#5B82FF" />
                    <TextInput
                      className="flex-1 ml-3 text-base text-white"
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                      }}
                    />
                    <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                      {showPassword ? (
                        <EyeOff size={18} color="rgba(255,255,255,0.5)" />
                      ) : (
                        <Eye size={18} color="rgba(255,255,255,0.5)" />
                      )}
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && (
                <Text className="text-red-400 text-xs mt-1">{errors.password.message}</Text>
              )}
            </View>

            <Pressable
              className="self-end"
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text className="text-blue-300 text-sm font-medium">Forgot Password?</Text>
            </Pressable>

            {authError && (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <Text className="text-red-400 text-sm">{authError}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-primary rounded-2xl h-14 items-center justify-center mt-2 active:opacity-80"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Sign In Now</Text>
              )}
            </Pressable>
          </View>

          <View className="flex-row justify-center mt-8 mb-6">
            <Text className="text-white/50">Don&apos;t have an account? </Text>
            <Pressable onPress={() => navigation.navigate("SignUp")}>
              <Text className="text-blue-300 font-semibold">Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
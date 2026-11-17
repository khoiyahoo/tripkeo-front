import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingCover } from "@/components/BlockingOverlay";

import type { ReactNode } from "react";

interface Props {
  visible: boolean;
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}

export const FormModal = ({
  visible,
  title,
  submitLabel,
  canSubmit,
  isSubmitting,
  error,
  onClose,
  onSubmit,
  children,
}: Props) => (
  <Modal
    animationType="slide"
    onRequestClose={isSubmitting ? undefined : onClose}
    presentationStyle="pageSheet"
    visible={visible}
  >
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between border-outline-variant border-b px-4 py-3">
          <Text className="font-semibold text-base text-on-surface">
            {title}
          </Text>
          <Pressable disabled={isSubmitting} hitSlop={12} onPress={onClose}>
            <Ionicons color="#abbbc2" name="close" size={24} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
          {error ? (
            <Text className="text-error-500 text-sm">{error}</Text>
          ) : null}
        </ScrollView>
        <View className="border-outline-variant border-t p-4">
          <Pressable
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary-500 active:bg-primary-600"
            disabled={!canSubmit || isSubmitting}
            onPress={onSubmit}
            style={{ opacity: canSubmit && !isSubmitting ? 1 : 0.5 }}
          >
            {isSubmitting && <ActivityIndicator color="#fff" />}
            <Text className="font-semibold text-white">{submitLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {isSubmitting && <LoadingCover />}
    </SafeAreaView>
  </Modal>
);

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DateField, Field, Input, SingleChips } from "@/components/form/fields";
import { useTrips } from "@/hooks/useTrips";
import { cn } from "@/lib/utils";
import {
  addDays,
  generateCoverSeed,
  getTodayDateStr,
  picsumCoverUrl,
} from "@/utils/cover";

import type { InvitedMember } from "@/types/firestore";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Role = InvitedMember["role"];
const ROLES: { value: Role; label: string }[] = [
  { value: "editor", label: "Biên tập" },
  { value: "member", label: "Thành viên" },
  { value: "treasurer", label: "Thủ quỹ" },
];
const ROLE_LABEL: Record<Role, string> = {
  editor: "Biên tập",
  member: "Thành viên",
  treasurer: "Thủ quỹ",
};

const STEPS = ["Thông tin", "Thành viên"];

export default function CreateTripScreen() {
  const router = useRouter();
  const { handleCreateTrip } = useTrips();
  const today = getTodayDateStr();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 2));
  const [coverSeed, setCoverSeed] = useState(generateCoverSeed());
  const [description, setDescription] = useState("");

  const [invited, setInvited] = useState<InvitedMember[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<Role>("editor");

  const dateError =
    startDate < today
      ? "Ngày bắt đầu không thể trong quá khứ"
      : startDate > endDate
        ? "Ngày kết thúc không thể trước ngày bắt đầu"
        : null;
  const step1Valid = !!name.trim() && !!destination.trim() && !dateError;

  const onStartChange = (v: string) => {
    setStartDate(v);
    if (v > endDate) setEndDate(v);
  };

  const addEmails = (raw: string) => {
    setEmailError(null);
    const list = raw
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (list.length === 0) return;

    const next = [...invited];
    for (const email of list) {
      if (!EMAIL_REGEX.test(email)) {
        setEmailError("Email không hợp lệ");
        continue;
      }
      if (next.some((m) => m.email === email)) {
        setEmailError("Email đã được thêm");
        continue;
      }
      next.push({ email, role: inviteRole });
    }
    setInvited(next);
    setEmailInput("");
  };

  const submit = async () => {
    if (!step1Valid) return;
    setIsSubmitting(true);
    try {
      const tripId = await handleCreateTrip({
        name: name.trim(),
        destination: destination.trim(),
        coverImage: picsumCoverUrl(coverSeed),
        startDate,
        endDate,
        description: description.trim(),
        currency: "VND",
        invitedMembers: invited.length > 0 ? invited : undefined,
      });
      router.replace({ pathname: "/trips/[tripId]", params: { tripId } });
    } catch {
      setIsSubmitting(false);
      Alert.alert("Lỗi", "Không thể tạo chuyến đi. Vui lòng thử lại.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons color="#fff" name="arrow-back" size={24} />
          </Pressable>
          <Text className="font-bold text-on-surface text-xl">
            Tạo chuyến đi mới
          </Text>
        </View>

        <View className="flex-row items-center justify-center gap-2 pb-3">
          {STEPS.map((label, i) => {
            const id = i + 1;
            const reached = step >= id;
            return (
              <View className="flex-row items-center gap-2" key={label}>
                <View
                  className={cn(
                    "h-8 w-8 items-center justify-center rounded-full",
                    reached ? "bg-primary-500" : "bg-surface-dim"
                  )}
                >
                  {step > id ? (
                    <Ionicons color="#fff" name="checkmark" size={16} />
                  ) : (
                    <Text
                      className={cn(
                        "font-semibold text-sm",
                        reached ? "text-white" : "text-on-surface-variant"
                      )}
                    >
                      {id}
                    </Text>
                  )}
                </View>
                <Text
                  className={cn(
                    "font-medium text-sm",
                    reached ? "text-on-surface" : "text-on-surface-variant"
                  )}
                >
                  {label}
                </Text>
                {i < STEPS.length - 1 && (
                  <View
                    className={cn(
                      "mx-1 h-0.5 w-8 rounded-full",
                      step > id ? "bg-primary-500" : "bg-surface-dim"
                    )}
                  />
                )}
              </View>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <>
              <Field label="Tên chuyến đi *">
                <Input
                  onChangeText={setName}
                  placeholder="VD: Đà Nẵng - Hội An 4N3Đ"
                  value={name}
                />
              </Field>
              <Field label="Điểm đến *">
                <Input
                  onChangeText={setDestination}
                  placeholder="Nhập điểm đến..."
                  value={destination}
                />
              </Field>
              <Field label="Ngày bắt đầu *">
                <DateField
                  min={today}
                  onChange={onStartChange}
                  value={startDate}
                />
              </Field>
              <Field label="Ngày kết thúc *">
                <DateField
                  min={startDate < today ? today : startDate}
                  onChange={setEndDate}
                  value={endDate}
                />
              </Field>
              {dateError && (
                <Text className="text-error-500 text-sm">{dateError}</Text>
              )}
              <Field label="Ảnh bìa">
                <View className="overflow-hidden rounded-xl">
                  <Image
                    contentFit="cover"
                    source={{ uri: picsumCoverUrl(coverSeed) }}
                    style={{ width: "100%", height: 160 }}
                  />
                </View>
                <Pressable
                  className="mt-1 h-10 flex-row items-center justify-center gap-2 self-start rounded-xl border border-outline-variant px-4"
                  onPress={() => setCoverSeed(generateCoverSeed())}
                >
                  <Ionicons color="#abbbc2" name="refresh" size={16} />
                  <Text className="font-medium text-on-surface text-sm">
                    Đổi ảnh
                  </Text>
                </Pressable>
              </Field>
              <Field label="Mô tả ngắn">
                <Input
                  className="h-24 py-2"
                  multiline
                  onChangeText={setDescription}
                  placeholder="Mô tả chuyến đi..."
                  textAlignVertical="top"
                  value={description}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Vai trò khi mời">
                <SingleChips
                  onChange={setInviteRole}
                  options={ROLES}
                  value={inviteRole}
                />
              </Field>
              <Field
                hint="Có thể dán nhiều email cùng lúc, cách nhau bằng dấu phẩy hoặc khoảng trắng."
                label="Mời thành viên qua email"
              >
                <View className="flex-row gap-2">
                  <Input
                    autoCapitalize="none"
                    className="flex-1"
                    keyboardType="email-address"
                    onChangeText={(t) => {
                      setEmailInput(t);
                      setEmailError(null);
                    }}
                    onSubmitEditing={() => addEmails(emailInput)}
                    placeholder="email@example.com"
                    returnKeyType="done"
                    value={emailInput}
                  />
                  <Pressable
                    className="h-11 items-center justify-center rounded-xl bg-primary-500 px-4 active:bg-primary-600"
                    disabled={!emailInput.trim()}
                    onPress={() => addEmails(emailInput)}
                    style={{ opacity: emailInput.trim() ? 1 : 0.5 }}
                  >
                    <Text className="font-semibold text-white">Thêm</Text>
                  </Pressable>
                </View>
                {emailError && (
                  <Text className="text-error-500 text-sm">{emailError}</Text>
                )}
              </Field>

              {invited.length > 0 ? (
                <View className="gap-2 rounded-xl bg-surface-card p-3">
                  <Text className="font-medium text-on-surface text-sm">
                    {invited.length} thành viên sẽ được mời
                  </Text>
                  {invited.map((m) => (
                    <View className="flex-row items-center gap-2" key={m.email}>
                      <Ionicons color="#abbbc2" name="mail-outline" size={16} />
                      <Text
                        className="flex-1 text-on-surface text-sm"
                        numberOfLines={1}
                      >
                        {m.email}
                      </Text>
                      <View className="rounded-full bg-surface-dim px-2 py-0.5">
                        <Text className="text-on-surface-variant text-xs">
                          {ROLE_LABEL[m.role]}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        onPress={() =>
                          setInvited((p) =>
                            p.filter((x) => x.email !== m.email)
                          )
                        }
                      >
                        <Ionicons color="#eb5757" name="close" size={18} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center rounded-xl bg-surface-card p-6">
                  <Ionicons color="#6b7280" name="people-outline" size={40} />
                  <Text className="mt-2 text-center font-medium text-on-surface">
                    Bạn có thể mời thêm sau khi tạo chuyến đi
                  </Text>
                  <Text className="mt-1 text-center text-on-surface-variant text-sm">
                    Nhập email thành viên để mời ngay hoặc bỏ qua bước này
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View className="flex-row justify-between gap-3 border-outline-variant border-t p-4">
          <Pressable
            className="h-12 flex-1 items-center justify-center rounded-xl border border-outline-variant"
            disabled={step === 1}
            onPress={() => setStep(1)}
            style={{ opacity: step === 1 ? 0.4 : 1 }}
          >
            <Text className="font-semibold text-on-surface">Quay lại</Text>
          </Pressable>
          {step === 1 ? (
            <Pressable
              className="h-12 flex-1 items-center justify-center rounded-xl bg-primary-500 active:bg-primary-600"
              disabled={!step1Valid}
              onPress={() => setStep(2)}
              style={{ opacity: step1Valid ? 1 : 0.5 }}
            >
              <Text className="font-semibold text-white">Tiếp tục</Text>
            </Pressable>
          ) : (
            <Pressable
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary-600 active:bg-primary-700"
              disabled={isSubmitting || !step1Valid}
              onPress={submit}
              style={{ opacity: isSubmitting || !step1Valid ? 0.5 : 1 }}
            >
              {isSubmitting && <ActivityIndicator color="#fff" />}
              <Text className="font-semibold text-white">Tạo chuyến đi</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

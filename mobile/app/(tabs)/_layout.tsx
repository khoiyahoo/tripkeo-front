import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Trang chủ", icon: "home-outline" },
  { name: "trips", title: "Chuyến đi", icon: "airplane-outline" },
  { name: "community", title: "Cộng đồng", icon: "people-outline" },
  { name: "profile", title: "Cá nhân", icon: "person-outline" },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#eb5757",
        tabBarInactiveTintColor: "#abbbc2",
        tabBarStyle: { backgroundColor: "#252836", borderTopColor: "#3a3d4a" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons color={color as string} name={t.icon} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { primaryColor, useSettings } from "@/context/settings-context";

export default function TabLayout() {
  const { settings } = useSettings();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primaryColor(settings.accentColor),
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: "Locations",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="mappin.and.ellipse" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="restock"
        options={{
          title: "Restock",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cart.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="archivebox.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="tag.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

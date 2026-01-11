import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from "expo-router";

import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "ChakraPetch_500Medium",
          fontSize: 12,
        },
        tabBarActiveTintColor: "#1E1D1F", // Using primary color
        tabBarInactiveTintColor: "#9CA3AF", // Gray-400
      }}
    >

      <Tabs.Screen name="home" options={{
        title: "Home",
        tabBarIcon: () => { return <MaterialIcons name="home" size={32} color="black" /> },
      }} />
      <Tabs.Screen name="expenses" options={{
        title: "Expenses",
        tabBarIcon: () => { return <MaterialIcons name="collections-bookmark" size={32} color="black" /> },
      }} />
      <Tabs.Screen name="analytics" options={{
        title: "Analytics",
        tabBarIcon: () => { return <MaterialIcons name="analytics" size={32} color="black" /> },
      }} />
      <Tabs.Screen name="settings" options={{
        title: "Settings",
        tabBarIcon: () => { return <MaterialIcons name="settings" size={32} color="black" /> },
      }} />
    </Tabs>
  )
}
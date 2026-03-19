import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { LensStorageProvider } from '@/context/LensStorageContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <LensStorageProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
          headerStyle: { backgroundColor: Colors[colorScheme ?? 'light'].card },
          headerTintColor: Colors[colorScheme ?? 'light'].text,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="lens-details"
          options={{
            title: 'Lens Details',
            tabBarIcon: ({ color }) => <TabBarIcon name="eye" color={color} />,
          }}
        />
        <Tabs.Screen
          name="power-converter"
          options={{
            title: 'Power Converter',
            tabBarIcon: ({ color }) => <TabBarIcon name="calculator" color={color} />,
          }}
        />
        <Tabs.Screen
          name="patients"
          options={{
            title: 'Records',
            tabBarIcon: ({ color }) => <TabBarIcon name="list-alt" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
      </Tabs>
    </LensStorageProvider>
  );
}

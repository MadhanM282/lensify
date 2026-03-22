import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { AppHeaderLogo } from '@/components/AppHeaderLogo';
import Colors from '@/constants/Colors';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  const theme = Colors[colorScheme];

  return (
    <LensStorageProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.tint,
          tabBarInactiveTintColor: theme.tabIconDefault,
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
          headerTitleAlign: 'center',
          /**
           * True screen-center title. @react-navigation/elements applies an asymmetric maxWidth
           * (wider reserved space for left than right), which shifts the title — override it.
           */
          headerTitleContainerStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            marginHorizontal: 0,
            marginLeft: 0,
            marginRight: 0,
            paddingHorizontal: 0,
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '100%',
            width: '100%',
          },
          headerTitleStyle: {
            textAlign: 'center',
          },
          headerLeft: () => <AppHeaderLogo />,
          headerLeftContainerStyle: {
            paddingLeft: 12,
            zIndex: 2,
            ...Platform.select({ android: { elevation: 6 } }),
          },
          headerRight: () => <ThemeToggle />,
          headerRightContainerStyle: {
            paddingRight: 12,
            zIndex: 2,
            ...Platform.select({ android: { elevation: 6 } }),
          },
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
          name="fitting-assessment"
          options={{
            title: 'Fitting Assessment',
            tabBarLabel: 'Fitting',
            tabBarIcon: ({ color }) => <TabBarIcon name="clipboard" color={color} />,
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

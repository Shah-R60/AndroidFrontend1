import { StyleSheet, Text,Image, View, SafeAreaView, Pressable } from 'react-native';
import React, { useState, useContext, useEffect, use } from 'react';
import { AuthContext } from '../AuthContext';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'core-js/stable/atob';
import axios from 'axios';



const HomeScreen = () => {
  const { userId, setUserId, setToken } = useContext(AuthContext);
  const [user, setUser] = useState(null);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     const token = await AsyncStorage.getItem('accessToken');
  //     if (!token) {
  //       console.log('No auth token found');
  //       return;
  //     }
  //     console.log('Auth token found:', token);
  //     if (token) {
  //       const decodedToken = jwtDecode(token);
  //       const userId = decodedToken.userId;
  //       console.log('Decoded userId:', userId);
  //       setUserId(userId);
  //     }
  //   };

  //   fetchUser();
  // }, []);



  useEffect(() => {
     fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {

        const token = await AsyncStorage.getItem('accessToken');
        console.log('Token:', token);
        if (!token) {
          console.log('No token found in storage');
          return;
        }
      const response = await axios.get(`http://10.0.2.2:5000/api/users/userInfo`,{
        headers:{
          Authorization: `Bearer ${token}`
        }
      });
      console.log('User data fetched:', response.data.data);
      setUser(response.data.data);
    } catch (error) {
      console.log('Error fetching user data:', error);
    }
  };

  useEffect(()=>{
    console.log('User data updated:', user);
    if (user) {
      setUser(user);
      setUserId(user._id);
    }
  },[user]);



  const logout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      setToken('');
    } catch (error) {
      console.log('Error during logout:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.info}>Logged in as:</Text>
        <Text style={styles.email}>{user?.user?.email || 'Loading...'}</Text>
        {user&&(
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.info}>User ID: {user._id}</Text>
            <Text style={styles.info}>Name: {user.name}</Text>
            <Text style={styles.info}>Email: {user.email}</Text>
            <Image
            source={{ uri: user.picture }}
            style={{ width: 100, height: 100, borderRadius: 50, marginTop: 10 }}
            resizeMode="cover"
            />
          </View>
        )}
         <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  info: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  email: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

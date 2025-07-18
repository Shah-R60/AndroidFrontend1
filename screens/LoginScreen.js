import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Pressable,
  Image,
} from 'react-native';
import React, {useEffect, useState, useContext} from 'react';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from '../AuthContext';
import {googleAuth} from '../api.js';

// Adjust the import path as necessary
GoogleSignin.configure({
  webClientId:
    '297892001189-s1i8r7cs1cq261mvgc4em2feov7rt9jk.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

const LoginScreen =() => {
  const {token, setToken} = useContext(AuthContext);

  const GoogleLogin = async () => {
   const r =  await GoogleSignin.hasPlayServices();
  //  console.log('Google Play Services:', r);
       await GoogleSignin.signOut(); // <-- This line is crucial
    const userInfo = await GoogleSignin.signIn();
    // console.log('u', userInfo);
    return userInfo;
  };

  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const response = await GoogleLogin(); // Google sign-in
      const {idToken} = response?.data; // Check if idToken is directly available

      if (!idToken) {
      console.warn('Google Sign-In failed: No ID token received.');
      return;
    }

      // console.log('idToken:', idToken); // Log idToken to check if it's retrieved

      // If idToken is not directly available, get it from response.data.idToken
      const token = idToken || response.data.idToken;
      // console.log('Extracted idToken from data:', token); // Log the extracted idToken
    
      
      if (token) {
        // Send idToken to the backend using axios
       const backendResponse = await axios.get('http://10.0.2.2:5000/auth/google', {
            params: {
              token: token, // or just token if variable name matches
            },
          });

        // const data = backendResponse;
        // console.log('Backend Response:', backendResponse.data);
        // console.log('Backend Response:', backendResponse.data.data.accessToken);
        const { accessToken, refreshToken, user } = backendResponse.data.data;
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);

    // Save to AsyncStorage (optional)
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);        
        setToken(accessToken);

        
      } else {
        console.log('No idToken received from Google Sign-In');
      }
    } catch (error) {
      console.log('Login Error:', error);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  const debugTokens = async () => {
    const access = await AsyncStorage.getItem('accessToken');
    const refresh = await AsyncStorage.getItem('refreshToken');
    console.log('Access Token:', access);
    console.log('Refresh Token:', refresh);
  };

  debugTokens();
}, []);


  return (
    <SafeAreaView>
      <View style={{marginTop: 30, alignItems: 'center'}}>
        <Image
          style={{width: 240, height: 80, resizeMode: 'contain'}}
          source={{uri: 'https://wanderlog.com/assets/logoWithText.png'}}
        />
      </View>

      <View style={{marginTop: 70}}>
        <Pressable
          onPress={handleGoogleLogin}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
            justifyContent: 'center',
            borderColor: '#E0E0E0',
            margin: 12,
            borderWidth: 1,
            gap: 30,
            borderRadius: 25,
            position: 'relative',
            marginTop: 20,
          }}>
          <Text style={{textAlign: 'center', fontSize: 15, fontWeight: '500'}}>
            Sign Up With Google
          </Text>
        </Pressable>

        <Pressable style={{marginTop: 12}}>
          <Text style={{textAlign: 'center', fontSize: 15, color: 'gray'}}>
            Already have an account? Sign In
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({});
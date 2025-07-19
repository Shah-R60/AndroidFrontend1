import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSocket } from '../context/SocketContext';
import { useNavigation } from '@react-navigation/native';



const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  const [liveUsers, setLiveUsers] = useState(0);
  const socket = useSocket();
  const navigation = useNavigation();

  // animated pulse for user counter
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulseAnim, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
//         Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
//       ])
//     ).start();
//   }, [pulseAnim]);

  useEffect(() => {
    if (!socket) return;
    const handleUserCount = ({ count }) => setLiveUsers(count);
    socket.on('user_count', handleUserCount);
    return () => {
      socket.off('user_count', handleUserCount);
    };
  }, [socket]);

  return (
//      <View style={styles.container}>
//       <View style={styles.landingMain}>
//         <View style={styles.liveUsersCounter}>
//           <View style={styles.statusDot} />
//           <Text style={styles.liveText}>{liveUsers} users online</Text>
//         </View>
//         <TouchableOpacity
//           style={styles.button}
//           onPress={() => navigation.navigate('Chat')} // Assumes a screen named 'Chat'
//         >
//           <Text style={styles.buttonText}>Start Talking</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
     <View style={styles.container}>
          <View style={{ flexDirection: 'row', alignItems: 'center' , gap: 10}}>
               <View style={styles.statusDot}></View>
               <Text>Live Users: {liveUsers}</Text>
          </View>
          <TouchableOpacity
            onPress={()=> navigation.navigate('Chat')}
            style={{
              backgroundColor: '#6758c7',
              padding: 15,
              borderRadius: 10,
              alignItems: 'center',
              marginTop: 20,
            }}>
            <Text style={{ color: 'white', fontSize: 18 }}>Start Chatting</Text>
          </TouchableOpacity>
     </View>
  );
}

const PARTICLE_SIZE = width * 1.5;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5ff',
    flexDirection: 'row',
    gap: 15,
    margin:10,
    justifyContent: 'center',
    alignItems: 'center',
    height: '20%',
    border: '1px solid #ccc',
  },
  particle: {
    position: 'absolute',
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    borderRadius: PARTICLE_SIZE / 2,
  },
  main: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(11,4,118,0.2)',
  },
  counterText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0b0476dc',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: 'black',
    fontSize: 30,
    fontWeight: '700',
  },
});

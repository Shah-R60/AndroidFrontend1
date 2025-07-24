import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Platform, PermissionsAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { useSocket } from '../context/SocketContext';

export default function ChatPage() {
  const [status, setStatus] = useState('Connecting to server...');
  const [partnerId, setPartnerId] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [myId, setMyId] = useState(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [showSafetyMsg, setShowSafetyMsg] = useState(true);
  const [showConnectedMsg, setShowConnectedMsg] = useState(false);
  const socket = useSocket();
  const socketRef = useRef();
  const pcRef = useRef();
  const localStreamRef = useRef();
  const pendingStreamRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!socket) {
      console.log('Socket not available, waiting for connection...');
      setStatus('Connecting to server...');
      return;
    }
    
    console.log('Socket available:', socket.id);
    socketRef.current = socket;

    // Check if socket is connected
    if (socket.connected) {
      console.log('Socket already connected with ID:', socket.id);
      setMyId(socket.id);
      setStatus('Looking for a partner...');
      socket.emit('find_partner');
    } else {
      console.log('Socket not connected yet, waiting...');
      setStatus('Connecting to server...');
    }

    socketRef.current.on('connect', () => {
      console.log('Socket connected with ID:', socketRef.current.id);
      setMyId(socketRef.current.id);
      setStatus('Looking for a partner...');
      socketRef.current.emit('find_partner');
    });

    socketRef.current.on('partner_found', async ({ partnerId, startTime, shouldInitiate }) => {
      console.log('Partner found:', partnerId, 'Should initiate:', shouldInitiate);
      setPartnerId(partnerId);
      setStartTime(startTime);
      setStatus('Partner found! Connecting...');
      await startCall(partnerId, shouldInitiate);
    });

    socketRef.current.on('waiting_for_partner', () => {
      console.log('Waiting for partner...');
      setStatus('Looking for a partner...');
    });

    socketRef.current.on('signal', async ({ from, data }) => {
      if (!pcRef.current) {
        console.log('No peer connection available');
        return;
      }
      try {
        console.log('Received signal:', data.type || 'candidate');
        if (data.type === 'offer') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socketRef.current.emit('signal', { to: from, data: answer });
        } else if (data.type === 'answer') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.error('Signal handling error:', e);
      }
    });

    socketRef.current.on('partner_disconnected', ({id}) => {
      if (id !== partnerId) return;
      cleanup();
      setStatus('Your partner has disconnected.');
      setCallActive(false);
    });

    socketRef.current.on('force_disconnect', () => {
      cleanup();
      setStatus('Partner left the call.');
      setTimeout(() => navigation.navigate('Home'), 1000);
    });

    return () => {
      console.log('Cleaning up ChatPage...');
      cleanup();
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('partner_found');
        socketRef.current.off('waiting_for_partner');
        socketRef.current.off('signal');
        socketRef.current.off('partner_disconnected');
        socketRef.current.off('force_disconnect');
      }
    };
  }, [socket]);

  useEffect(() => {
    // Handle pending stream if any
    if (pendingStreamRef.current) {
      // Audio in react-native-webrtc plays automatically
      pendingStreamRef.current = null;
    }
  }, []);

  // Function to request microphone permission
  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to make voice calls.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Denied',
            'Microphone permission is required to make voice calls. Please enable it in app settings.',
            [{ text: 'OK' }]
          );
          return false;
        }
        return true;
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    return true; // iOS permissions are handled differently
  };

  async function startCall(partnerId, isInitiator) {
    console.log('Starting call with partner:', partnerId, 'Is initiator:', isInitiator);
    
    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setStatus('Microphone permission required to start call.');
      return;
    }
    
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, 
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pcRef.current.onicecandidate = event => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socketRef.current.emit('signal', { to: partnerId, data: { candidate: event.candidate } });
      }
    };

    pcRef.current.onaddstream = event => {
      console.log('Received remote stream');
      // Remote audio stream received; it'll play automatically
    };

    try {
      console.log('Requesting microphone access...');
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      console.log('Got local stream');
      localStreamRef.current = stream;
      
      // Use addTrack instead of deprecated addStream
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind);
        pcRef.current.addTrack(track, stream);
      });

      // Wait for ICE gathering or timeout
      await new Promise(res => {
        if (pcRef.current.iceGatheringState === 'complete') return res();
        const t = setTimeout(res, 3000);
        pcRef.current.addEventListener('icegatheringstatechange', () => {
          if (pcRef.current.iceGatheringState === 'complete') {
            clearTimeout(t);
            res();
          }
        });
      });

      if (isInitiator) {
        console.log('Creating offer...');
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socketRef.current.emit('signal', { to: partnerId, data: offer });
      }

      setCallActive(true);
      setStatus('Connected! You are now talking.');
      setShowConnectedMsg(true);

      // Start timer
      const currentTime = Date.now();
      setDuration(Math.floor((currentTime - startTime) / 1000));
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);
        if (elapsed >= 900) {
          cleanup();
          setStatus('Call ended: 15 minute limit.');
          clearInterval(interval);
          setTimeout(() => navigation.navigate('Home'), 2000);
        }
      }, 1000);
    } catch (err) {
      console.error('Error starting call:', err);
      
      if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
        setStatus('Microphone access denied. Please allow microphone permission and try again.');
        Alert.alert(
          'Permission Required',
          'Microphone access is required to make voice calls. Please enable microphone permission in your device settings and try again.',
          [{ text: 'OK' }]
        );
      } else if (err.name === 'NotFoundError') {
        setStatus('No microphone found on this device.');
      } else {
        setStatus('Failed to start call. Please try again.');
      }
    }
  }

  function cleanup() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setCallActive(false);
  }

  function leaveCall() {
    console.log('Leaving call...');
    if (socketRef.current && partnerId) {
      socketRef.current.emit('leave_call', { to: partnerId });
    }
    cleanup();
    navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Icon name="phone" size={32} />
          <Icon5 name="bolt" size={20} style={styles.bolt} />
        </View>
        <Text style={styles.status}>{status}</Text>
        {callActive && (
          <>
            <Text style={styles.talking}>Talking to a stranger...</Text>
            <Text style={styles.timer}>{
              `${String(Math.floor(duration/60)).padStart(2,'0')}:${String(duration%60).padStart(2,'0')}`
            }</Text>
          </>
        )}
        <TouchableOpacity style={styles.leaveBtn} onPress={leaveCall}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </View>
      {showSafetyMsg && (
        <View style={styles.infoBar}>
          <Text style={styles.infoMsg}>⚠️ Stay safe: Don't share personal information</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f2' },
  card: { width: '90%', padding: 20, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', elevation: 3 },
  iconCircle: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bolt: { marginLeft: -10, marginTop: -10 },
  status: { fontSize: 16, marginVertical: 10, textAlign: 'center' },
  talking: { fontSize: 18, marginTop: 10 },
  timer: { fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  leaveBtn: { marginTop: 20, paddingHorizontal: 30, paddingVertical: 10, backgroundColor: '#e74c3c', borderRadius: 8 },
  leaveText: { color: '#fff', fontSize: 16 },
  infoBar: { position: 'absolute', bottom: 0, width: '100%', padding: 10, backgroundColor: '#ffeb3b' },
  infoMsg: { textAlign: 'center' }
});

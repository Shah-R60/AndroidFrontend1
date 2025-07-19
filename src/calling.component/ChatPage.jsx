import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
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
  const socket = useSocket();
  const socketRef = useRef();
  const pcRef = useRef();
  const localStreamRef = useRef();
  const pendingStreamRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!socket) return;
    socketRef.current = socket;

    socketRef.current.on('connect', () => {
      setMyId(socketRef.current.id);
    });
    setStatus('Looking for a partner...');
    socketRef.current.emit('find_partner');

    socketRef.current.on('partner_found', async ({ partnerId, startTime, shouldInitiate }) => {
      setPartnerId(partnerId);
      setStartTime(startTime);
      setStatus('Partner found! Connecting...');
      await startCall(partnerId, shouldInitiate);
    });

    socketRef.current.on('signal', async ({ from, data }) => {
      if (!pcRef.current) return;
      try {
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
        console.error(e);
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
      cleanup();
      socketRef.current.off('connect');
      socketRef.current.off('partner_found');
      socketRef.current.off('signal');
      socketRef.current.off('partner_disconnected');
      socketRef.current.off('force_disconnect');
    };
  }, [socket]);

  useEffect(() => {
    // Handle pending stream if any
    if (pendingStreamRef.current) {
      // Audio in react-native-webrtc plays automatically
      pendingStreamRef.current = null;
    }
  }, []);

  async function startCall(partnerId, isInitiator) {
    pcRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    });

    pcRef.current.onicecandidate = event => {
      if (event.candidate) {
        socketRef.current.emit('signal', { to: partnerId, data: { candidate: event.candidate } });
      }
    };

    pcRef.current.onaddstream = event => {
      // Remote audio stream received; it'll play automatically
      console.log('Received remote stream');
    };

    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      pcRef.current.addStream(stream);

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
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socketRef.current.emit('signal', { to: partnerId, data: offer });
      }

      setCallActive(true);
      setStatus('Connected! You are now talking.');

      // Start timer
      setDuration(Math.floor((Date.now() - startTime) / 1000));
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
      console.error(err);
      setStatus('Microphone access denied.');
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
    if (socketRef.current && partnerId) socketRef.current.emit('leave_call', { to: partnerId });
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

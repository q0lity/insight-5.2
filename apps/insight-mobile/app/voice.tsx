import React from 'react';
import { Redirect } from 'expo-router';

export default function VoiceCaptureRedirect() {
  return <Redirect href="/capture" />;
}

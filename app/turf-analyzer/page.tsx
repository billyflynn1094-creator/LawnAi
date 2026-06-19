'use client';

import { useState, useEffect, useCallback } from 'react';
import CameraCapture from '@/components/Camera';
import LocationBadge from '@/components/LocationBadge';
import AnalysisResults from '@/components/Analysis';
import DownloadReportButton from '@/components/DownloadReportButton';
import { Scan, RotateCcw, MapPin, Navigation, ScanSearch, AlertCircle } from 'lucide-react';
// Subscribe to the shared detection-service wake-up / keep-alive state.

import { useEffect, useState } from 'react';
import { detectionWake, DetectionStatusSnapshot } from '../services/detectionWakeService';

export const useDetectionStatus = (): DetectionStatusSnapshot => {
    const [snapshot, setSnapshot] = useState<DetectionStatusSnapshot>(() => detectionWake.getSnapshot());

    useEffect(() => detectionWake.subscribe(setSnapshot), []);

    return snapshot;
};

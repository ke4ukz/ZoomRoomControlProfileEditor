// Catalog of Zoom Rooms Native Room Control event IDs sourced from
// Zoom's published documentation. Legacy IDs (meeting_started / meeting_ended)
// without the zr_ prefix are still supported by Zoom; we keep them here so
// profiles that use the older form still get friendly labels.
//
// `label` is the human-readable name shown on buttons; `id` is the raw string
// that goes in the JSON profile's `rules` keys.

export const ZOOM_EVENTS = [
    // --- Meeting ---
    { id: 'meeting_started', label: 'Meeting Started (legacy)', category: 'Meeting' },
    { id: 'meeting_ended', label: 'Meeting Ended (legacy)', category: 'Meeting' },
    { id: 'zr_meeting_started', label: 'Meeting Started', category: 'Meeting' },
    { id: 'zr_meeting_ended', label: 'Meeting Ended', category: 'Meeting' },
    { id: 'zr_zoom_meeting_started', label: 'Zoom Meeting Started', category: 'Meeting' },
    { id: 'zr_zoom_meeting_ended', label: 'Zoom Meeting Ended', category: 'Meeting' },
    { id: 'zr_interop_meeting_started', label: 'Interop Meeting Started', category: 'Meeting' },
    { id: 'zr_interop_meeting_ended', label: 'Interop Meeting Ended', category: 'Meeting' },
    { id: 'zr_meeting_ring_started', label: 'Incoming Meeting Invite Start', category: 'Meeting' },
    { id: 'zr_meeting_ring_ended', label: 'Incoming Meeting Invite End', category: 'Meeting' },
    { id: 'zr_meeting_item_about_to_start', label: 'Next Meeting Alert Triggered', category: 'Meeting' },
    { id: 'zr_meeting_item_start', label: 'Meeting List Item Start', category: 'Meeting' },
    { id: 'zr_meeting_item_stop', label: 'Meeting List Item Stop', category: 'Meeting' },

    // --- Phone ---
    { id: 'zr_phone_ring_started', label: 'Incoming Phone Call Start', category: 'Phone' },
    { id: 'zr_phone_ring_ended', label: 'Incoming Phone Call End', category: 'Phone' },
    { id: 'zr_phone_call_started', label: 'Phone Call Started', category: 'Phone' },
    { id: 'zr_phone_call_ended', label: 'Phone Call Ended', category: 'Phone' },

    // --- In-Meeting: Video ---
    { id: 'zr_video_started', label: 'Video On', category: 'In-Meeting Video' },
    { id: 'zr_video_stopped', label: 'Video Off', category: 'In-Meeting Video' },
    { id: 'zr_video_device_changed', label: 'Video Device Changed', category: 'In-Meeting Video' },

    // --- In-Meeting: Audio ---
    { id: 'zr_microphone_unmuted', label: 'Mic Unmuted', category: 'In-Meeting Audio' },
    { id: 'zr_microphone_muted', label: 'Mic Muted', category: 'In-Meeting Audio' },
    { id: 'zr_audio_device_changed', label: 'Audio Device Changed', category: 'In-Meeting Audio' },

    // --- In-Meeting: Content ---
    { id: 'zr_share_started', label: 'Wireless Sharing Started', category: 'In-Meeting Content' },
    { id: 'zr_share_ended', label: 'Wireless Sharing Ended', category: 'In-Meeting Content' },
    { id: 'zr_hdmi_share_started', label: 'HDMI Sharing Started', category: 'In-Meeting Content' },
    { id: 'zr_hdmi_share_ended', label: 'HDMI Sharing Stopped', category: 'In-Meeting Content' },

    // --- In-Meeting: Recording ---
    { id: 'zr_recording_started', label: 'Recording Started', category: 'In-Meeting Recording' },
    { id: 'zr_recording_ended', label: 'Recording Stopped', category: 'In-Meeting Recording' },

    // --- Elevation ---
    { id: 'zr_elevate_to_meeting', label: 'Meeting Elevation', category: 'Elevation' },

    // --- Pairing ---
    { id: 'zr_user_paired', label: 'User Paired to ZR', category: 'Pairing' },
    { id: 'zr_user_unpaired', label: 'User Unpaired from ZR', category: 'Pairing' },

    // --- Digital Signage ---
    { id: 'zr_digital_signage_started', label: 'Digital Signage Begins', category: 'Digital Signage' },
    { id: 'zr_digital_signage_ended', label: 'Digital Signage Dismissed', category: 'Digital Signage' },

    // --- Whiteboard ---
    { id: 'zr_whiteboard_started', label: 'Whiteboarding Opened', category: 'Whiteboard' },
    { id: 'zr_whiteboard_ended', label: 'Whiteboarding Closed', category: 'Whiteboard' },
    { id: 'zr_companion_whiteboard_connected', label: 'Companion Whiteboard Connected', category: 'Whiteboard' },
    { id: 'zr_companion_whiteboard_disconnected', label: 'Companion Whiteboard Disconnected', category: 'Whiteboard' },

    // --- Admin / Operation ---
    { id: 'zr_operation_time_started', label: 'Operation Time Begins', category: 'Admin' },
    { id: 'zr_operation_time_ended', label: 'Operation Time Ends', category: 'Admin' },
    { id: 'zr_people_detected', label: 'People Detected', category: 'Admin' },
    { id: 'zr_people_not_detected', label: 'No People Detected', category: 'Admin' },
    { id: 'zr_voice_command_on', label: 'Voice Commands Enabled', category: 'Admin' },
    { id: 'zr_voice_command_off', label: 'Voice Commands Disabled', category: 'Admin' },
    { id: 'zr_zoom_app_opened', label: 'Zoom App Opened', category: 'Admin' },
    { id: 'zr_zoom_app_closed', label: 'Zoom App Closed', category: 'Admin' },
    { id: 'zr_room_controls_opened', label: 'Room Controls Opened', category: 'Admin' },
    { id: 'zr_room_controls_closed', label: 'Room Controls Closed', category: 'Admin' },
    { id: 'zr_room_startup_completed', label: 'Zoom Rooms Startup Completed', category: 'Admin' },
];

export const ZOOM_EVENTS_BY_ID = Object.fromEntries(
    ZOOM_EVENTS.map((event) => [event.id, event])
);

export function eventLabel(id) {
    return ZOOM_EVENTS_BY_ID[id]?.label ?? id;
}

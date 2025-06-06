document.addEventListener('DOMContentLoaded', () => {
    // Generate a random meeting ID (5 characters)
    const generateMeetingId = () => {
        return Math.random().toString(36).substring(2, 7);
    };

    // Handle create meeting button clicks
    const handleCreateMeeting = () => {
        const meetingId = generateMeetingId();
        window.location.href = `/room.html?room=${meetingId}`;
    };

    // Handle join meeting button clicks
    const handleJoinMeeting = () => {
        const meetingIdInput = document.getElementById('meeting-id-input');
        let meetingId = meetingIdInput.value.trim();
        
        // If no meeting ID is provided, generate one
        if (!meetingId) {
            meetingId = generateMeetingId();
        }
        
        // Clean the meeting ID (remove any URL parts if user pasted a full link)
        if (meetingId.includes('/')) {
            const parts = meetingId.split('/');
            meetingId = parts[parts.length - 1];
        }
        
        window.location.href = `/room.html?room=${meetingId}`;
    };

    // Attach event listeners to buttons
    const createMeetingBtn = document.getElementById('create-meeting');
    const joinMeetingBtn = document.getElementById('join-meeting');
    const ctaCreateMeetingBtn = document.getElementById('cta-create-meeting');

    if (createMeetingBtn) {
        createMeetingBtn.addEventListener('click', handleCreateMeeting);
    }

    if (joinMeetingBtn) {
        joinMeetingBtn.addEventListener('click', handleJoinMeeting);
    }

    if (ctaCreateMeetingBtn) {
        ctaCreateMeetingBtn.addEventListener('click', handleCreateMeeting);
    }

    // Handle Enter key press in the meeting ID input
    const meetingIdInput = document.getElementById('meeting-id-input');
    if (meetingIdInput) {
        meetingIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleJoinMeeting();
            }
        });
    }

    // Add smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                document.querySelector(targetId).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

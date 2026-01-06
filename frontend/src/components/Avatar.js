import React from 'react';

export default function Avatar({ username, image, size = "md" }) {
    const sizeClasses = {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-14 h-14 text-base",
        xl: "w-24 h-24 text-xl"
    };

    const dims = {
        sm: { width: '32px', height: '32px' },
        md: { width: '40px', height: '40px' },
        lg: { width: '56px', height: '56px' },
        xl: { width: '96px', height: '96px' }
    };

    const style = {
        ...dims[size],
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: '#7209b7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        color: 'white',
        border: '2px solid rgba(255,255,255,0.1)'
    };

    if (image) {
        return <img src={image} alt={username} style={style} />;
    }

    return (
        <div style={style}>
            {username ? username.substring(0, 2).toUpperCase() : "??"}
        </div>
    );
}

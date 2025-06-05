

import React, { useState, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    Button,
    Dimensions,
    Alert,
    Image,
    Platform,
    PermissionsAndroid
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import ViewShot from 'react-native-view-shot';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { filter, find, result } from 'lodash';
import styles from './GenerateMeme.styles';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const DraggableZoomableImage = ({ uri }) => {
    const centerX = -75;
    const centerY = -150;
    const translateX = useSharedValue(centerX);
    const translateY = useSharedValue(centerY);
    const scale = useSharedValue(1);

    const savedTranslateX = useSharedValue(centerX);
    const savedTranslateY = useSharedValue(centerY);
    const savedScale = useSharedValue(1);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 4));
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.draggable, animatedStyle]}>
                <Image source={{ uri }} style={styles.image} />
            </Animated.View>
        </GestureDetector>
    );
};

const DraggableText = ({ id, text, onChangeText, startX = 100, startY = 100, toggleMenu = {}, targetText = '', setIsEditing = {}, isEditing = false }) => {
    const translateX = useSharedValue(startX);
    const translateY = useSharedValue(startY);
    const savedX = useSharedValue(startX);
    const savedY = useSharedValue(startY);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = savedX.value + e.translationX;
            translateY.value = savedY.value + e.translationY;
        })
        .onEnd(() => {
            savedX.value = translateX.value;
            savedY.value = translateY.value;
        });

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 4));
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.draggableText, animatedStyle]}>
                {isEditing && targetText === id ? (
                    <TextInput
                        style={styles.textInput}
                        value={text}
                        onChangeText={(t) => onChangeText(id, t)}
                        autoFocus={isEditing && targetText === id}
                        onBlur={() => setIsEditing(false)}
                        onEndEditing={() => {
                            setIsEditing(false);
                        }
                        }
                    />
                ) : (
                    <TouchableOpacity TouchableOpacity={0.9} onPress={() => toggleMenu(id)}>
                        <Text style={styles.textDisplay}>{text}</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </GestureDetector>
    );
};

export default function MultiTextDraggable() {
    const [texts, setTexts] = useState([]);
    const [targetText, setTargetTexts] = useState('');
    const [images, setImages] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    const deleteAll = () => {
        setTexts([]);
        setTargetTexts('');
        setImages([]);
        setIsEditing(false);
    }
    const selectImages = () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                selectionLimit: 1, // 0 = unlimited
            },
            (response) => {
                if (response.assets) {
                    setImages(response.assets.map((asset) => asset.uri
                    ));
                }
            }
        );
    };
    const addTextBox = () => {
        const newId = texts.length > 0 ? texts[texts.length - 1].id + 1 : 1;


        const offset = 20 * texts.length;

        const centerX = (windowWidth / 3.2) - 75 + offset;
        const centerY = (windowHeight / 3.2) - 100 + offset;

        setTexts([
            ...texts,
            {
                id: newId,
                text: 'New Text',
                x: centerX,
                y: centerY,
            },
        ]);
    };

    const copiedTextBox = (copiedText = '') => {
        const newId = texts.length > 0 ? texts[texts.length - 1].id + 1 : 1;


        const offset = 20 * texts.length;

        const centerX = (windowWidth / 3.2) - 75 + offset;
        const centerY = (windowHeight / 3.2) - 100 + offset;

        setTexts([
            ...texts,
            {
                id: newId,
                text: copiedText,
                x: centerX,
                y: centerY,
            },
        ]);
    };

    const updateText = (id, newText) => {
        setTexts((prev) =>
            prev.map((item) => (item.id === id ? { ...item, text: newText } : item))
        );
    };
    const [visible, setVisible] = useState(false);

    const toggleMenu = (id) => {
        setTargetTexts(id);
        setVisible(!visible);
    };

    const viewShotRef = useRef();

    const requestAndroidPermission = async () => {
        try {
            const checkingOS = Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES : PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            const granted = await PermissionsAndroid.request(
                checkingOS,
                {
                    title: 'Izin Akses Penyimpanan',
                    message: 'Aplikasi ini memerlukan izin untuk menyimpan gambar ke galeri.',
                    buttonNeutral: 'Tanya Nanti',
                    buttonNegative: 'Tolak',
                    buttonPositive: 'Izinkan',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {

            return false;
        }
    };

    const captureAndSave = async () => {
        const uri = await viewShotRef.current.capture();

        if (Platform.OS === 'android') {
            const hasPermission = await requestAndroidPermission();
            if (!hasPermission) {
                Alert.alert('Izin ditolak', 'Tidak bisa menyimpan gambar tanpa izin');
                return;
            }
        }
        try {
            await CameraRoll.save(uri, { type: 'photo' });
            Alert.alert('Berhasil', 'Gambar disimpan ke galeri!');
        } catch (e) {

            Alert.alert('Gagal', 'Gagal menyimpan gambar.');
        }
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.outterCanvas}>
                <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
                    <View style={styles.canvas}>
                        <View>
                            {images.map((uri, index) => (
                                <DraggableZoomableImage key={index} uri={uri} />
                            ))}
                            {texts.map((item) => (
                                <DraggableText
                                    key={item.id}
                                    id={item.id}
                                    text={item.text}
                                    startX={item.x}
                                    startY={item.y}
                                    onChangeText={updateText}
                                    toggleMenu={toggleMenu}
                                    targetText={targetText}
                                    setIsEditing={setIsEditing}
                                    isEditing={isEditing}
                                />
                            ))}
                        </View>

                    </View>
                </ViewShot>
            </View>
            {visible && (
                <View style={styles.popup}>
                    <View>
                        <Text style={styles.optionText}>Pilihan</Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                        setIsEditing(true);
                        setVisible(!visible);
                    }}>
                        <Text style={styles.option}>Ganti Teks</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        const filtered = find(texts, (item) => item.id === targetText);
                        copiedTextBox(result(filtered, 'text', ''));
                        setVisible(!visible);
                    }}>
                        <Text style={styles.option}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        const filtered = filter(texts, (item) => item.id !== targetText);
                        setVisible(!visible);
                        setTexts(filtered);
                    }}>
                        <Text style={styles.option}>Hapus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleMenu}>
                        <Text style={[styles.option, { color: 'red' }]}>Close</Text>
                    </TouchableOpacity>
                </View>
            )}
            <View style={styles.horizontal}>
                <Button title="Add Text" onPress={addTextBox} />
                <Button title="Add Image" onPress={selectImages} />
                <Button title="Delete ALL" onPress={deleteAll} />
                <Button title="Save Image" onPress={captureAndSave} />
            </View>
        </GestureHandlerRootView>
    );
}

import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface PhotoCarouselProps {
  photos: string[];
}

export default function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.carouselContainer}>
      <Image
        source={{ uri: photos[currentIndex] }}
        style={styles.carouselImage}
        resizeMode="cover"
      />

      {/* Indicadores */}
      <View style={styles.carouselIndicators}>
        {photos.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
            onPress={() => setCurrentIndex(index)}
          />
        ))}
      </View>

      {/* Botões de navegação */}
      {photos.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.carouselButton, styles.leftButton]}
            onPress={goToPrevious}
          >
            <View style={styles.buttonText}>‹</View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.carouselButton, styles.rightButton]}
            onPress={goToNext}
          >
            <View style={styles.buttonText}>›</View>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  carouselImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  carouselIndicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#ffffff',
    transform: [{ scale: 1.2 }],
  },
  carouselButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -16 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  leftButton: {
    left: 12,
  },
  rightButton: {
    right: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
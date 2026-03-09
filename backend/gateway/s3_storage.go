package main

import (
	"fmt"
	"time"
)

// StorageClient simulates interaction with AWS S3 / CloudFront
type StorageClient struct {
	BucketName string
	Region     string
}

// NewStorageClient creates a new mock storage client
func NewStorageClient(bucket, region string) *StorageClient {
	return &StorageClient{
		BucketName: bucket,
		Region:     region,
	}
}

// GetAudioBuffer simulates fetching audio from S3
func (s *StorageClient) GetAudioBuffer(videoID string) ([]byte, error) {
	fmt.Printf("[STORAGE] Fetching audio buffer for video %s from bucket %s\n", videoID, s.BucketName)
	// Mock delay for CloudFront edge fetching
	time.Sleep(1 * time.Second)
	return []byte("mock_audio_data"), nil
}

// UploadResultStream simulates pushing the final result to the CDN
func (s *StorageClient) UploadResultStream(streamPath string, data []byte) (string, error) {
	fmt.Printf("[STORAGE] Uploading final muxed stream to %s/%s\n", s.BucketName, streamPath)
	time.Sleep(1500 * time.Millisecond)
	return fmt.Sprintf("https://cdn.maatram.ai/%s", streamPath), nil
}

/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
'use strict'

var $protobuf = require('protobufjs/light')

var $root = (
  $protobuf.roots['default'] || ($protobuf.roots['default'] = new $protobuf.Root())
).addJSON({
  WebrtcStats: {
    fields: {
      local: { type: 'local_obj', id: 1 },
      remote: { type: 'remote_obj', id: 2 },
      timestamp: { type: 'int64', id: 3 },
      appkey: { type: 'string', id: 4 },
      cid: { type: 'int64', id: 5 },
      uid: { type: 'int64', id: 6 },
      browser: { type: 'string', id: 7 },
      platform: { type: 'string', id: 8 }
    },
    nested: {
      local_obj: {
        fields: {
          video_bwe: { rule: 'repeated', type: 'video_bwe_obj', id: 1 },
          audio_ssrc: { rule: 'repeated', type: 'audio_ssrc_obj', id: 2 },
          video_ssrc: { rule: 'repeated', type: 'video_ssrc_obj', id: 3 },
          video_track: { rule: 'repeated', type: 'video_track_obj', id: 4 },
          audio_outbound_rtp: { rule: 'repeated', type: 'audio_outbound_rtp_obj', id: 5 },
          video_outbound_rtp: { rule: 'repeated', type: 'video_outbound_rtp_obj', id: 6 },
          screen_ssrc: { rule: 'repeated', type: 'screen_ssrc_obj', id: 7 },
          screen_outbound_rtp: { rule: 'repeated', type: 'screen_outbound_rtp_obj', id: 8 }
        },
        nested: {
          video_bwe_obj: {
            fields: {
              googActualEncBitrate: { type: 'string', id: 1 },
              googAvailableSendBandwidth: { type: 'string', id: 2 },
              googRetransmitBitrate: { type: 'string', id: 3 },
              googAvailableReceiveBandwidth: { type: 'string', id: 4 },
              googTargetEncBitrate: { type: 'string', id: 5 },
              googBucketDelay: { type: 'string', id: 6 },
              googTransmitBitrate: { type: 'string', id: 7 },
              id: { type: 'string', id: 8 },
              type: { type: 'string', id: 9 },
              timestamp: { type: 'string', id: 10 }
            }
          },
          audio_ssrc_obj: {
            fields: {
              audioInputLevel: { type: 'string', id: 1 },
              packetsLost: { type: 'string', id: 2 },
              googRtt: { type: 'string', id: 3 },
              totalSamplesDuration: { type: 'string', id: 4 },
              googEchoCancellationReturnLossEnhancement: { type: 'string', id: 5 },
              googTrackId: { type: 'string', id: 6 },
              totalAudioEnergy: { type: 'string', id: 7 },
              transportId: { type: 'string', id: 8 },
              mediaType: { type: 'string', id: 9 },
              googEchoCancellationReturnLoss: { type: 'string', id: 10 },
              googCodecName: { type: 'string', id: 11 },
              ssrc: { type: 'string', id: 12 },
              googJitterReceived: { type: 'string', id: 13 },
              googTypingNoiseState: { type: 'string', id: 14 },
              packetsSent: { type: 'string', id: 15 },
              bytesSent: { type: 'string', id: 16 },
              id: { type: 'string', id: 17 },
              type: { type: 'string', id: 18 },
              timestamp: { type: 'string', id: 19 },
              localuid: { type: 'int64', id: 20 },
              remoteuid: { type: 'int64', id: 21 },
              bitsSentPerSecond: { type: 'int64', id: 22 },
              packetsSentPerSecond: { type: 'int64', id: 23 },
              sendPacketLoss: { type: 'int64', id: 24 },
              bytesSentPerSecond: { type: 'int64', id: 25 },
              alr: { type: 'int64', id: 26 },
              packetsLostPerSecond: { type: 'double', id: 27 },
              streamType: { type: 'string', id: 28 }
            }
          },
          video_ssrc_obj: {
            fields: {
              googContentType: { type: 'string', id: 1 },
              googFrameWidthInput: { type: 'string', id: 2 },
              googFrameWidthSent: { type: 'string', id: 3 },
              packetsLost: { type: 'string', id: 4 },
              googRtt: { type: 'string', id: 5 },
              googHasEnteredLowResolution: { type: 'string', id: 6 },
              googEncodeUsagePercent: { type: 'string', id: 7 },
              googCpuLimitedResolution: { type: 'string', id: 8 },
              googNacksReceived: { type: 'string', id: 9 },
              googBandwidthLimitedResolution: { type: 'string', id: 10 },
              googFrameHeightInput: { type: 'string', id: 11 },
              googAvgEncodeMs: { type: 'string', id: 12 },
              googTrackId: { type: 'string', id: 13 },
              googFrameRateInput: { type: 'string', id: 14 },
              framesEncoded: { type: 'string', id: 15 },
              codecImplementationName: { type: 'string', id: 16 },
              transportId: { type: 'string', id: 17 },
              mediaType: { type: 'string', id: 18 },
              googFrameHeightSent: { type: 'string', id: 19 },
              googFrameRateSent: { type: 'string', id: 20 },
              googCodecName: { type: 'string', id: 21 },
              hugeFramesSent: { type: 'string', id: 22 },
              qpSum: { type: 'string', id: 23 },
              googPlisReceived: { type: 'string', id: 24 },
              googAdaptationChanges: { type: 'string', id: 25 },
              ssrc: { type: 'string', id: 26 },
              googFirsReceived: { type: 'string', id: 27 },
              packetsSent: { type: 'string', id: 28 },
              bytesSent: { type: 'string', id: 29 },
              id: { type: 'string', id: 30 },
              type: { type: 'string', id: 31 },
              timestamp: { type: 'string', id: 32 },
              localuid: { type: 'int64', id: 33 },
              remoteuid: { type: 'int64', id: 34 },
              bitsSentPerSecond: { type: 'int64', id: 35 },
              packetsSentPerSecond: { type: 'int64', id: 36 },
              sendPacketLoss: { type: 'int64', id: 37 },
              freezeTime: { type: 'int64', id: 38 },
              totalFreezeTime: { type: 'int64', id: 39 },
              bytesSentPerSecond: { type: 'int64', id: 40 },
              framesEncodedPerSecond: { type: 'int64', id: 41 },
              googActualEncBitrate: { type: 'string', id: 42 },
              googAvailableSendBandwidth: { type: 'string', id: 43 },
              googRetransmitBitrate: { type: 'string', id: 44 },
              googAvailableReceiveBandwidth: { type: 'string', id: 45 },
              googTargetEncBitrate: { type: 'string', id: 46 },
              googBucketDelay: { type: 'string', id: 47 },
              googTransmitBitrate: { type: 'string', id: 48 },
              vlr: { type: 'int64', id: 49 },
              packetsLostPerSecond: { type: 'double', id: 50 },
              streamType: { type: 'string', id: 51 }
            }
          },
          screen_ssrc_obj: {
            fields: {
              googContentType: { type: 'string', id: 1 },
              googFrameWidthInput: { type: 'string', id: 2 },
              googFrameWidthSent: { type: 'string', id: 3 },
              packetsLost: { type: 'string', id: 4 },
              googRtt: { type: 'string', id: 5 },
              googHasEnteredLowResolution: { type: 'string', id: 6 },
              googEncodeUsagePercent: { type: 'string', id: 7 },
              googCpuLimitedResolution: { type: 'string', id: 8 },
              googNacksReceived: { type: 'string', id: 9 },
              googBandwidthLimitedResolution: { type: 'string', id: 10 },
              googFrameHeightInput: { type: 'string', id: 11 },
              googAvgEncodeMs: { type: 'string', id: 12 },
              googTrackId: { type: 'string', id: 13 },
              googFrameRateInput: { type: 'string', id: 14 },
              framesEncoded: { type: 'string', id: 15 },
              codecImplementationName: { type: 'string', id: 16 },
              transportId: { type: 'string', id: 17 },
              mediaType: { type: 'string', id: 18 },
              googFrameHeightSent: { type: 'string', id: 19 },
              googFrameRateSent: { type: 'string', id: 20 },
              googCodecName: { type: 'string', id: 21 },
              hugeFramesSent: { type: 'string', id: 22 },
              qpSum: { type: 'string', id: 23 },
              googPlisReceived: { type: 'string', id: 24 },
              googAdaptationChanges: { type: 'string', id: 25 },
              ssrc: { type: 'string', id: 26 },
              googFirsReceived: { type: 'string', id: 27 },
              packetsSent: { type: 'string', id: 28 },
              bytesSent: { type: 'string', id: 29 },
              id: { type: 'string', id: 30 },
              type: { type: 'string', id: 31 },
              timestamp: { type: 'string', id: 32 },
              localuid: { type: 'int64', id: 33 },
              remoteuid: { type: 'int64', id: 34 },
              bitsSentPerSecond: { type: 'int64', id: 35 },
              packetsSentPerSecond: { type: 'int64', id: 36 },
              sendPacketLoss: { type: 'int64', id: 37 },
              freezeTime: { type: 'int64', id: 38 },
              totalFreezeTime: { type: 'int64', id: 39 },
              bytesSentPerSecond: { type: 'int64', id: 40 },
              framesEncodedPerSecond: { type: 'int64', id: 41 },
              googActualEncBitrate: { type: 'string', id: 42 },
              googAvailableSendBandwidth: { type: 'string', id: 43 },
              googRetransmitBitrate: { type: 'string', id: 44 },
              googAvailableReceiveBandwidth: { type: 'string', id: 45 },
              googTargetEncBitrate: { type: 'string', id: 46 },
              googBucketDelay: { type: 'string', id: 47 },
              googTransmitBitrate: { type: 'string', id: 48 },
              vlr: { type: 'int64', id: 49 },
              packetsLostPerSecond: { type: 'double', id: 50 },
              streamType: { type: 'string', id: 51 }
            }
          },
          video_track_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              detached: { type: 'bool', id: 4 },
              ended: { type: 'bool', id: 5 },
              frameHeight: { type: 'int64', id: 6 },
              frameWidth: { type: 'int64', id: 7 },
              framesSent: { type: 'int64', id: 8 },
              remoteSource: { type: 'bool', id: 9 },
              trackIdentifier: { type: 'string', id: 10 },
              ssrc: { type: 'int64', id: 11 },
              frameRateSent: { type: 'int64', id: 12 },
              mediaType: { type: 'string', id: 13 },
              framesSentPerSecond: { type: 'int64', id: 14 },
              uid: { type: 'string', id: 15 }
            }
          },
          audio_outbound_rtp_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              codecId: { type: 'string', id: 4 },
              kind: { type: 'string', id: 5 },
              mediaType: { type: 'string', id: 6 },
              ssrc: { type: 'int64', id: 7 },
              transportId: { type: 'string', id: 8 },
              bytesSent: { type: 'int64', id: 9 },
              packetsSent: { type: 'int64', id: 10 },
              headerBytesSent: { type: 'int64', id: 11 },
              mediaSourceId: { type: 'string', id: 12 },
              remoteId: { type: 'string', id: 13 },
              retransmittedBytesSent: { type: 'int64', id: 14 },
              retransmittedPacketsSent: { type: 'int64', id: 15 },
              trackId: { type: 'string', id: 16 },
              bitsSentPerSecond: { type: 'int64', id: 17 },
              packetsSentPerSecond: { type: 'int64', id: 18 },
              bytesSentPerSecond: { type: 'int64', id: 19 },
              nackCount: { type: 'int64', id: 20 },
              isRemote: { type: 'bool', id: 21 },
              qpSum: { type: 'int64', id: 22 },
              uid: { type: 'string', id: 23 },
              streamType: { type: 'string', id: 24 }
            }
          },
          video_outbound_rtp_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              codecId: { type: 'string', id: 4 },
              kind: { type: 'string', id: 5 },
              mediaType: { type: 'string', id: 6 },
              ssrc: { type: 'int64', id: 7 },
              transportId: { type: 'string', id: 8 },
              bytesSent: { type: 'int64', id: 9 },
              packetsSent: { type: 'int64', id: 10 },
              firCount: { type: 'int64', id: 11 },
              frameHeight: { type: 'int64', id: 12 },
              frameWidth: { type: 'int64', id: 13 },
              framesEncoded: { type: 'int64', id: 14 },
              framesPerSecond: { type: 'int64', id: 15 },
              framesSent: { type: 'int64', id: 16 },
              headerBytesSent: { type: 'int64', id: 17 },
              hugeFramesSent: { type: 'int64', id: 18 },
              keyFramesEncoded: { type: 'int64', id: 19 },
              mediaSourceId: { type: 'string', id: 20 },
              nackCount: { type: 'int64', id: 21 },
              pliCount: { type: 'int64', id: 22 },
              qpSum: { type: 'int64', id: 23 },
              qualityLimitationResolutionChanges: { type: 'int64', id: 24 },
              remoteId: { type: 'string', id: 25 },
              retransmittedBytesSent: { type: 'int64', id: 26 },
              retransmittedPacketsSent: { type: 'int64', id: 27 },
              totalEncodeTime: { type: 'double', id: 28 },
              totalEncodedBytesTarget: { type: 'int64', id: 29 },
              totalPacketSendDelay: { type: 'double', id: 30 },
              trackId: { type: 'string', id: 31 },
              bitsSentPerSecond: { type: 'int64', id: 32 },
              packetsSentPerSecond: { type: 'int64', id: 33 },
              frameRateSent: { type: 'int64', id: 34 },
              bytesSentPerSecond: { type: 'int64', id: 35 },
              framesEncodedPerSecond: { type: 'int64', id: 36 },
              bitrateMean: { type: 'int64', id: 37 },
              bitrateStdDev: { type: 'int64', id: 38 },
              droppedFrames: { type: 'int64', id: 39 },
              framerateMean: { type: 'int64', id: 40 },
              framerateStdDev: { type: 'int64', id: 41 },
              isRemote: { type: 'bool', id: 42 },
              uid: { type: 'string', id: 43 },
              streamType: { type: 'string', id: 44 }
            }
          },
          screen_outbound_rtp_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              kind: { type: 'string', id: 4 },
              mediaType: { type: 'string', id: 5 },
              ssrc: { type: 'int64', id: 6 },
              bytesSent: { type: 'int64', id: 7 },
              packetsSent: { type: 'int64', id: 8 },
              bitrateMean: { type: 'double', id: 9 },
              bitrateStdDev: { type: 'double', id: 10 },
              droppedFrames: { type: 'int64', id: 11 },
              firCount: { type: 'int64', id: 12 },
              framerateMean: { type: 'int64', id: 13 },
              framerateStdDev: { type: 'int64', id: 14 },
              framesEncoded: { type: 'int64', id: 15 },
              nackCount: { type: 'int64', id: 16 },
              pliCount: { type: 'int64', id: 17 },
              bytesSentPerSecond: { type: 'int64', id: 18 },
              framesEncodedPerSecond: { type: 'int64', id: 19 },
              packetsSentPerSecond: { type: 'int64', id: 20 },
              remoteId: { type: 'string', id: 21 },
              streamType: { type: 'string', id: 22 },
              framesPerSecond: { type: 'int64', id: 23 }
            }
          }
        }
      },
      remote_obj: {
        fields: {
          video_ssrc: { rule: 'repeated', type: 'video_ssrc_obj', id: 1 },
          audio_ssrc: { rule: 'repeated', type: 'audio_ssrc_obj', id: 2 },
          audio_inbound_rtp: { rule: 'repeated', type: 'audio_inbound_rtp_obj', id: 3 },
          video_inbound_rtp: { rule: 'repeated', type: 'video_inbound_rtp_obj', id: 4 },
          audio_track: { rule: 'repeated', type: 'audio_track_obj', id: 5 },
          video_track: { rule: 'repeated', type: 'video_track_obj', id: 6 },
          screen_ssrc: { rule: 'repeated', type: 'screen_ssrc_obj', id: 7 },
          screen_inbound_rtp: { rule: 'repeated', type: 'screen_inbound_rtp_obj', id: 8 }
        },
        nested: {
          video_ssrc_obj: {
            fields: {
              googContentType: { type: 'string', id: 1 },
              googCaptureStartNtpTimeMs: { type: 'string', id: 2 },
              googTargetDelayMs: { type: 'string', id: 3 },
              packetsLost: { type: 'string', id: 4 },
              googDecodeMs: { type: 'string', id: 5 },
              googFrameHeightReceived: { type: 'string', id: 6 },
              googFrameRateOutput: { type: 'string', id: 7 },
              packetsReceived: { type: 'string', id: 8 },
              ssrc: { type: 'string', id: 9 },
              googRenderDelayMs: { type: 'string', id: 10 },
              googMaxDecodeMs: { type: 'string', id: 11 },
              googTrackId: { type: 'string', id: 12 },
              googFrameWidthReceived: { type: 'string', id: 13 },
              codecImplementationName: { type: 'string', id: 14 },
              transportId: { type: 'string', id: 15 },
              mediaType: { type: 'string', id: 16 },
              googInterframeDelayMax: { type: 'string', id: 17 },
              googCodecName: { type: 'string', id: 18 },
              googFrameRateReceived: { type: 'string', id: 19 },
              framesDecoded: { type: 'string', id: 20 },
              googNacksSent: { type: 'string', id: 21 },
              googFirsSent: { type: 'string', id: 22 },
              bytesReceived: { type: 'string', id: 23 },
              googFirstFrameReceivedToDecodedMs: { type: 'string', id: 24 },
              googCurrentDelayMs: { type: 'string', id: 25 },
              googMinPlayoutDelayMs: { type: 'string', id: 26 },
              googFrameRateDecoded: { type: 'string', id: 27 },
              googJitterBufferMs: { type: 'string', id: 28 },
              googPlisSent: { type: 'string', id: 29 },
              id: { type: 'string', id: 30 },
              type: { type: 'string', id: 31 },
              timestamp: { type: 'string', id: 32 },
              localuid: { type: 'int64', id: 33 },
              remoteuid: { type: 'string', id: 34 },
              bitsReceivedPerSecond: { type: 'int64', id: 35 },
              packetsReceivedPerSecond: { type: 'int64', id: 36 },
              recvPacketLoss: { type: 'int64', id: 37 },
              freezeTime: { type: 'int64', id: 38 },
              totalFreezeTime: { type: 'int64', id: 39 },
              bytesReceivedPerSecond: { type: 'int64', id: 40 },
              framesDecodedPerSecond: { type: 'int64', id: 41 },
              packetsLostRate: { type: 'double', id: 42 },
              packetsLostPerSecond: { type: 'double', id: 43 },
              streamType: { type: 'string', id: 44 }
            }
          },
          audio_ssrc_obj: {
            fields: {
              googDecodingCTN: { type: 'string', id: 1 },
              packetsLost: { type: 'string', id: 2 },
              googSecondaryDecodedRate: { type: 'string', id: 3 },
              googDecodingPLC: { type: 'string', id: 4 },
              packetsReceived: { type: 'string', id: 5 },
              googJitterReceived: { type: 'string', id: 6 },
              googDecodingCNG: { type: 'string', id: 7 },
              ssrc: { type: 'string', id: 8 },
              googPreferredJitterBufferMs: { type: 'string', id: 9 },
              googSpeechExpandRate: { type: 'string', id: 10 },
              totalSamplesDuration: { type: 'string', id: 11 },
              totalAudioEnergy: { type: 'string', id: 12 },
              transportId: { type: 'string', id: 13 },
              mediaType: { type: 'string', id: 14 },
              googDecodingPLCCNG: { type: 'string', id: 15 },
              googCodecName: { type: 'string', id: 16 },
              googSecondaryDiscardedRate: { type: 'string', id: 17 },
              googDecodingNormal: { type: 'string', id: 18 },
              googTrackId: { type: 'string', id: 19 },
              audioOutputLevel: { type: 'string', id: 20 },
              googAccelerateRate: { type: 'string', id: 21 },
              bytesReceived: { type: 'string', id: 22 },
              googCurrentDelayMs: { type: 'string', id: 23 },
              googDecodingCTSG: { type: 'string', id: 24 },
              googExpandRate: { type: 'string', id: 25 },
              googPreemptiveExpandRate: { type: 'string', id: 26 },
              googJitterBufferMs: { type: 'string', id: 27 },
              googDecodingMuted: { type: 'string', id: 28 },
              id: { type: 'string', id: 29 },
              type: { type: 'string', id: 30 },
              timestamp: { type: 'string', id: 31 },
              localuid: { type: 'int64', id: 32 },
              remoteuid: { type: 'string', id: 33 },
              bitsReceivedPerSecond: { type: 'int64', id: 34 },
              packetsReceivedPerSecond: { type: 'int64', id: 35 },
              recvPacketLoss: { type: 'int64', id: 36 },
              freezeTime: { type: 'int64', id: 37 },
              totalFreezeTime: { type: 'int64', id: 38 },
              bytesReceivedPerSecond: { type: 'int64', id: 39 },
              packetsLostRate: { type: 'double', id: 40 },
              packetsLostPerSecond: { type: 'double', id: 41 },
              alr: { type: 'double', id: 42 },
              streamType: { type: 'string', id: 43 }
            }
          },
          audio_inbound_rtp_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              codecId: { type: 'string', id: 4 },
              kind: { type: 'string', id: 5 },
              mediaType: { type: 'string', id: 6 },
              ssrc: { type: 'int64', id: 7 },
              transportId: { type: 'string', id: 8 },
              jitter: { type: 'double', id: 9 },
              packetsLost: { type: 'int64', id: 10 },
              packetsReceived: { type: 'int64', id: 11 },
              audioLevel: { type: 'int64', id: 12 },
              bytesReceived: { type: 'int64', id: 13 },
              concealedSamples: { type: 'int64', id: 14 },
              concealmentEvents: { type: 'int64', id: 15 },
              estimatedPlayoutTimestamp: { type: 'int64', id: 16 },
              fecPacketsDiscarded: { type: 'int64', id: 17 },
              fecPacketsReceived: { type: 'int64', id: 18 },
              headerBytesReceived: { type: 'int64', id: 19 },
              insertedSamplesForDeceleration: { type: 'int64', id: 20 },
              jitterBufferDelay: { type: 'double', id: 21 },
              jitterBufferEmittedCount: { type: 'int64', id: 22 },
              lastPacketReceivedTimestamp: { type: 'double', id: 23 },
              removedSamplesForAcceleration: { type: 'int64', id: 24 },
              silentConcealedSamples: { type: 'int64', id: 25 },
              totalAudioEnergy: { type: 'double', id: 26 },
              totalSamplesDuration: { type: 'double', id: 27 },
              totalSamplesReceived: { type: 'int64', id: 28 },
              trackId: { type: 'string', id: 29 },
              bitsReceivedPerSecond: { type: 'int64', id: 30 },
              packetsReceivedPerSecond: { type: 'int64', id: 31 },
              uid: { type: 'string', id: 32 },
              bytesReceivedPerSecond: { type: 'int64', id: 33 },
              packetsLostRate: { type: 'double', id: 34 },
              recvPacketLoss: { type: 'int64', id: 35 },
              remoteuid: { type: 'string', id: 36 },
              isRemote: { type: 'bool', id: 37 },
              packetsLostPerSecond: { type: 'int64', id: 38 },
              qpSum: { type: 'int64', id: 39 },
              streamType: { type: 'string', id: 40 }
            }
          },
          video_inbound_rtp_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              codecId: { type: 'string', id: 4 },
              kind: { type: 'string', id: 5 },
              mediaType: { type: 'string', id: 6 },
              ssrc: { type: 'int64', id: 7 },
              transportId: { type: 'string', id: 8 },
              packetsLost: { type: 'int64', id: 9 },
              packetsReceived: { type: 'int64', id: 10 },
              bytesReceived: { type: 'int64', id: 11 },
              estimatedPlayoutTimestamp: { type: 'int64', id: 12 },
              firCount: { type: 'int64', id: 13 },
              frameHeight: { type: 'int64', id: 14 },
              frameWidth: { type: 'int64', id: 15 },
              framesDecoded: { type: 'int64', id: 16 },
              framesPerSecond: { type: 'int64', id: 17 },
              framesReceived: { type: 'int64', id: 18 },
              headerBytesReceived: { type: 'int64', id: 19 },
              keyFramesDecoded: { type: 'int64', id: 20 },
              lastPacketReceivedTimestamp: { type: 'int64', id: 21 },
              nackCount: { type: 'int64', id: 22 },
              pliCount: { type: 'int64', id: 23 },
              totalDecodeTime: { type: 'double', id: 24 },
              totalInterFrameDelay: { type: 'double', id: 25 },
              totalSquaredInterFrameDelay: { type: 'double', id: 26 },
              trackId: { type: 'string', id: 27 },
              bitsReceivedPerSecond: { type: 'int64', id: 28 },
              packetsReceivedPerSecond: { type: 'int64', id: 29 },
              uid: { type: 'string', id: 30 },
              bytesReceivedPerSecond: { type: 'int64', id: 31 },
              packetsLostRate: { type: 'double', id: 32 },
              framesDecodedPerSecond: { type: 'double', id: 33 },
              recvPacketLoss: { type: 'int64', id: 34 },
              remoteuid: { type: 'string', id: 35 },
              isRemote: { type: 'bool', id: 36 },
              qpSum: { type: 'int64', id: 37 },
              packetsLostPerSecond: { type: 'double', id: 38 },
              streamType: { type: 'string', id: 39 }
            }
          },
          screen_inbound_rtp_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              kind: { type: 'string', id: 4 },
              mediaType: { type: 'string', id: 5 },
              ssrc: { type: 'int64', id: 6 },
              discardedPackets: { type: 'int64', id: 7 },
              jitter: { type: 'double', id: 8 },
              packetsLost: { type: 'int64', id: 9 },
              packetsReceived: { type: 'int64', id: 10 },
              bitrateMean: { type: 'double', id: 11 },
              bitrateStdDev: { type: 'double', id: 12 },
              bytesReceived: { type: 'int64', id: 13 },
              firCount: { type: 'int64', id: 14 },
              framerateMean: { type: 'double', id: 15 },
              framerateStdDev: { type: 'double', id: 16 },
              framesDecoded: { type: 'int64', id: 17 },
              nackCount: { type: 'int64', id: 18 },
              pliCount: { type: 'int64', id: 19 },
              remoteId: { type: 'string', id: 20 },
              targetUid: { type: 'string', id: 21 },
              bytesReceivedPerSecond: { type: 'int64', id: 22 },
              packetsLostPerSecond: { type: 'int64', id: 23 },
              framesDecodedPerSecond: { type: 'int64', id: 24 },
              recvPacketLoss: { type: 'int64', id: 25 },
              packetsReceivedPerSecond: { type: 'int64', id: 26 },
              remoteuid: { type: 'string', id: 27 },
              packetsLostRate: { type: 'double', id: 28 },
              streamType: { type: 'string', id: 29 },
              framesPerSecond: { type: 'int64', id: 30 }
            }
          },
          audio_track_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              audioLevel: { type: 'double', id: 4 },
              detached: { type: 'bool', id: 5 },
              ended: { type: 'bool', id: 6 },
              jitterBufferFlushes: { type: 'int64', id: 7 },
              remoteSource: { type: 'bool', id: 8 },
              trackIdentifier: { type: 'string', id: 9 },
              mediaType: { type: 'string', id: 10 },
              ssrc: { type: 'int64', id: 11 },
              uid: { type: 'string', id: 12 }
            }
          },
          video_track_obj: {
            fields: {
              id: { type: 'string', id: 1 },
              timestamp: { type: 'int64', id: 2 },
              type: { type: 'string', id: 3 },
              detached: { type: 'bool', id: 4 },
              ended: { type: 'bool', id: 5 },
              frameHeight: { type: 'int64', id: 6 },
              frameWidth: { type: 'int64', id: 7 },
              framesDecoded: { type: 'int64', id: 8 },
              framesDropped: { type: 'int64', id: 9 },
              framesReceived: { type: 'int64', id: 10 },
              freezeCount: { type: 'int64', id: 11 },
              pauseCount: { type: 'int64', id: 12 },
              remoteSource: { type: 'bool', id: 13 },
              sumOfSquaredFramesDuration: { type: 'double', id: 14 },
              totalFramesDuration: { type: 'double', id: 15 },
              totalFreezesDuration: { type: 'double', id: 16 },
              totalPausesDuration: { type: 'int64', id: 17 },
              trackIdentifier: { type: 'string', id: 18 },
              ssrc: { type: 'int64', id: 19 },
              mediaType: { type: 'string', id: 20 },
              uid: { type: 'string', id: 21 }
            }
          },
          screen_ssrc_obj: {
            fields: {
              googContentType: { type: 'string', id: 1 },
              googCaptureStartNtpTimeMs: { type: 'string', id: 2 },
              googTargetDelayMs: { type: 'string', id: 3 },
              packetsLost: { type: 'string', id: 4 },
              googDecodeMs: { type: 'string', id: 5 },
              googFrameHeightReceived: { type: 'string', id: 6 },
              googFrameRateOutput: { type: 'string', id: 7 },
              packetsReceived: { type: 'string', id: 8 },
              ssrc: { type: 'string', id: 9 },
              googRenderDelayMs: { type: 'string', id: 10 },
              googMaxDecodeMs: { type: 'string', id: 11 },
              googTrackId: { type: 'string', id: 12 },
              googFrameWidthReceived: { type: 'string', id: 13 },
              codecImplementationName: { type: 'string', id: 14 },
              transportId: { type: 'string', id: 15 },
              mediaType: { type: 'string', id: 16 },
              googInterframeDelayMax: { type: 'string', id: 17 },
              googCodecName: { type: 'string', id: 18 },
              googFrameRateReceived: { type: 'string', id: 19 },
              framesDecoded: { type: 'string', id: 20 },
              googNacksSent: { type: 'string', id: 21 },
              googFirsSent: { type: 'string', id: 22 },
              bytesReceived: { type: 'string', id: 23 },
              googFirstFrameReceivedToDecodedMs: { type: 'string', id: 24 },
              googCurrentDelayMs: { type: 'string', id: 25 },
              googMinPlayoutDelayMs: { type: 'string', id: 26 },
              googFrameRateDecoded: { type: 'string', id: 27 },
              googJitterBufferMs: { type: 'string', id: 28 },
              googPlisSent: { type: 'string', id: 29 },
              id: { type: 'string', id: 30 },
              type: { type: 'string', id: 31 },
              timestamp: { type: 'string', id: 32 },
              localuid: { type: 'int64', id: 33 },
              remoteuid: { type: 'string', id: 34 },
              bitsReceivedPerSecond: { type: 'int64', id: 35 },
              packetsReceivedPerSecond: { type: 'int64', id: 36 },
              recvPacketLoss: { type: 'int64', id: 37 },
              freezeTime: { type: 'int64', id: 38 },
              totalFreezeTime: { type: 'int64', id: 39 },
              bytesReceivedPerSecond: { type: 'int64', id: 40 },
              framesDecodedPerSecond: { type: 'int64', id: 41 },
              packetsLostRate: { type: 'double', id: 42 },
              packetsLostPerSecond: { type: 'double', id: 43 },
              vlr: { type: 'int64', id: 44 },
              streamType: { type: 'string', id: 45 }
            }
          }
        }
      }
    }
  }
})

module.exports = $root

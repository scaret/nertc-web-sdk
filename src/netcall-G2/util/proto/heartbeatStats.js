/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
'use strict'
var $protobuf = require('protobufjs/light') // test 专用
// var $protobuf = require('./protobuf-js/light') // product 专用

var $root = (
  $protobuf.roots['default'] || ($protobuf.roots['default'] = new $protobuf.Root())
).addJSON({
  WebrtcStats: {
    fields: {
      local: {
        type: 'local_obj',
        id: 1
      },
      remote: {
        type: 'remote_obj',
        id: 2
      },
      timestamp: {
        type: 'int64',
        id: 3
      },
      appkey: {
        type: 'string',
        id: 4
      },
      cid: {
        type: 'int64',
        id: 5
      },
      uid: {
        type: 'int64',
        id: 6
      },
      browser: {
        type: 'string',
        id: 7
      },
      platform: {
        type: 'string',
        id: 8
      },
      sdkVersion: {
        type: 'string',
        id: 9
      }
    },
    nested: {
      local_obj: {
        fields: {
          audio_ssrc: {
            rule: 'repeated',
            type: 'audio_ssrc_obj',
            id: 1
          },
          audioSlave_ssrc: {
            rule: 'repeated',
            type: 'audioSlave_ssrc_obj',
            id: 2
          },
          video_ssrc: {
            rule: 'repeated',
            type: 'video_ssrc_obj',
            id: 3
          },
          screen_ssrc: {
            rule: 'repeated',
            type: 'screen_ssrc_obj',
            id: 4
          },
          bwe: {
            rule: 'repeated',
            type: 'bwe_obj',
            id: 5
          }
        },
        nested: {
          audio_ssrc_obj: {
            fields: {
              audioInputLevel: {
                type: 'string',
                id: 1
              },
              totalAudioEnergy: {
                type: 'double',
                id: 2
              },
              mediaType: {
                type: 'string',
                id: 3
              },
              transportId: {
                type: 'string',
                id: 4
              },
              packetsLost: {
                type: 'int64',
                id: 5
              },
              googRtt: {
                type: 'string',
                id: 6
              },
              googEchoCancellationReturnLoss: {
                type: 'string',
                id: 7
              },
              googCodecName: {
                type: 'string',
                id: 8
              },
              ssrc: {
                type: 'int64',
                id: 9
              },
              googJitterReceived: {
                type: 'string',
                id: 10
              },
              googEchoCancellationReturnLossEnhancement: {
                type: 'string',
                id: 11
              },
              packetsSent: {
                type: 'int64',
                id: 12
              },
              bytesSent: {
                type: 'int64',
                id: 13
              },
              totalSamplesDuration: {
                type: 'double',
                id: 14
              },
              googTrackId: {
                type: 'string',
                id: 15
              },
              id: {
                type: 'string',
                id: 16
              },
              type: {
                type: 'string',
                id: 17
              },
              timestamp: {
                type: 'int64',
                id: 18
              },
              streamType: {
                type: 'string',
                id: 19
              },
              uid: {
                type: 'int64',
                id: 20
              },
              dataId: {
                type: 'string',
                id: 21
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 22
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 23
              },
              packetsLostPerSecond: {
                type: 'int64',
                id: 24
              },
              sendPacketLoss: {
                type: 'int64',
                id: 25
              },
              packetsLostRate: {
                type: 'int64',
                id: 26
              },
              kind: {
                type: 'string',
                id: 27
              },
              trackId: {
                type: 'string',
                id: 28
              },
              codecId: {
                type: 'string',
                id: 29
              },
              mediaSourceId: {
                type: 'string',
                id: 30
              },
              remoteId: {
                type: 'string',
                id: 31
              },
              mid: {
                type: 'string',
                id: 32
              },
              retransmittedPacketsSent: {
                type: 'int64',
                id: 33
              },
              retransmittedBytesSent: {
                type: 'int64',
                id: 34
              },
              targetBitrate: {
                type: 'int64',
                id: 35
              },
              nackCount: {
                type: 'int64',
                id: 36
              },
              active: {
                type: 'int64',
                id: 37
              },
              jitter: {
                type: 'double',
                id: 38
              },
              localId: {
                type: 'string',
                id: 39
              },
              roundTripTime: {
                type: 'double',
                id: 40
              },
              fractionLost: {
                type: 'int64',
                id: 41
              },
              totalRoundTripTime: {
                type: 'double',
                id: 42
              },
              roundTripTimeMeasurements: {
                type: 'int64',
                id: 43
              },
              headerBytesSent: {
                type: 'int64',
                id: 44
              }
            }
          },
          audioSlave_ssrc_obj: {
            fields: {
              audioInputLevel: {
                type: 'string',
                id: 1
              },
              totalAudioEnergy: {
                type: 'double',
                id: 2
              },
              mediaType: {
                type: 'string',
                id: 3
              },
              transportId: {
                type: 'string',
                id: 4
              },
              packetsLost: {
                type: 'int64',
                id: 5
              },
              googRtt: {
                type: 'string',
                id: 6
              },
              roundTripTimeMeasurements: {
                type: 'int64',
                id: 7
              },
              googCodecName: {
                type: 'string',
                id: 8
              },
              ssrc: {
                type: 'int64',
                id: 9
              },
              googJitterReceived: {
                type: 'string',
                id: 10
              },
              headerBytesSent: {
                type: 'int64',
                id: 11
              },
              packetsSent: {
                type: 'int64',
                id: 12
              },
              bytesSent: {
                type: 'int64',
                id: 13
              },
              totalSamplesDuration: {
                type: 'double',
                id: 14
              },
              googTrackId: {
                type: 'string',
                id: 15
              },
              id: {
                type: 'string',
                id: 16
              },
              type: {
                type: 'string',
                id: 17
              },
              timestamp: {
                type: 'int64',
                id: 18
              },
              streamType: {
                type: 'string',
                id: 19
              },
              uid: {
                type: 'int64',
                id: 20
              },
              dataId: {
                type: 'string',
                id: 21
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 22
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 23
              },
              packetsLostPerSecond: {
                type: 'int64',
                id: 24
              },
              sendPacketLoss: {
                type: 'int64',
                id: 25
              },
              packetsLostRate: {
                type: 'int64',
                id: 26
              },
              kind: {
                type: 'string',
                id: 27
              },
              trackId: {
                type: 'string',
                id: 28
              },
              codecId: {
                type: 'string',
                id: 29
              },
              mediaSourceId: {
                type: 'string',
                id: 30
              },
              remoteId: {
                type: 'string',
                id: 31
              },
              mid: {
                type: 'string',
                id: 32
              },
              retransmittedPacketsSent: {
                type: 'int64',
                id: 33
              },
              retransmittedBytesSent: {
                type: 'int64',
                id: 34
              },
              targetBitrate: {
                type: 'int64',
                id: 35
              },
              nackCount: {
                type: 'int64',
                id: 36
              },
              active: {
                type: 'int64',
                id: 37
              },
              jitter: {
                type: 'double',
                id: 38
              },
              localId: {
                type: 'string',
                id: 39
              },
              roundTripTime: {
                type: 'double',
                id: 40
              },
              fractionLost: {
                type: 'int64',
                id: 41
              },
              totalRoundTripTime: {
                type: 'double',
                id: 42
              }
            }
          },
          video_ssrc_obj: {
            fields: {
              googContentType: {
                type: 'string',
                id: 1
              },
              googFrameWidthInput: {
                type: 'string',
                id: 2
              },
              packetsLost: {
                type: 'int64',
                id: 3
              },
              googRtt: {
                type: 'string',
                id: 4
              },
              googHasEnteredLowResolution: {
                type: 'int64',
                id: 5
              },
              googEncodeUsagePercent: {
                type: 'string',
                id: 6
              },
              googCpuLimitedResolution: {
                type: 'int64',
                id: 7
              },
              hugeFramesSent: {
                type: 'int64',
                id: 8
              },
              googNacksReceived: {
                type: 'string',
                id: 9
              },
              googBandwidthLimitedResolution: {
                type: 'int64',
                id: 10
              },
              googFrameHeightInput: {
                type: 'string',
                id: 11
              },
              googPlisReceived: {
                type: 'string',
                id: 12
              },
              googFrameRateInput: {
                type: 'string',
                id: 13
              },
              googAvgEncodeMs: {
                type: 'string',
                id: 14
              },
              googTrackId: {
                type: 'string',
                id: 15
              },
              codecImplementationName: {
                type: 'string',
                id: 16
              },
              transportId: {
                type: 'string',
                id: 17
              },
              framesEncoded: {
                type: 'int64',
                id: 18
              },
              mediaType: {
                type: 'string',
                id: 19
              },
              googFrameHeightSent: {
                type: 'string',
                id: 20
              },
              googFrameRateSent: {
                type: 'string',
                id: 21
              },
              googCodecName: {
                type: 'string',
                id: 22
              },
              qpSum: {
                type: 'int64',
                id: 23
              },
              googAdaptationChanges: {
                type: 'string',
                id: 24
              },
              ssrc: {
                type: 'int64',
                id: 25
              },
              googFirsReceived: {
                type: 'string',
                id: 26
              },
              googFrameWidthSent: {
                type: 'string',
                id: 27
              },
              packetsSent: {
                type: 'int64',
                id: 28
              },
              bytesSent: {
                type: 'int64',
                id: 29
              },
              id: {
                type: 'string',
                id: 30
              },
              type: {
                type: 'string',
                id: 31
              },
              timestamp: {
                type: 'int64',
                id: 32
              },
              streamType: {
                type: 'string',
                id: 33
              },
              dataId: {
                type: 'int64',
                id: 34
              },
              freezeTime: {
                type: 'int64',
                id: 35
              },
              totalFreezeTime: {
                type: 'int64',
                id: 36
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 37
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 38
              },
              packetsLostPerSecond: {
                type: 'int64',
                id: 39
              },
              sendPacketLoss: {
                type: 'int64',
                id: 40
              },
              packetsLostRate: {
                type: 'int64',
                id: 41
              },
              framesEncodedPerSecond: {
                type: 'int64',
                id: 42
              },
              qpPercentage: {
                type: 'double',
                id: 43
              },
              kind: {
                type: 'string',
                id: 44
              },
              trackId: {
                type: 'string',
                id: 45
              },
              codecId: {
                type: 'string',
                id: 46
              },
              mediaSourceId: {
                type: 'string',
                id: 47
              },
              remoteId: {
                type: 'string',
                id: 48
              },
              mid: {
                type: 'string',
                id: 49
              },
              retransmittedPacketsSent: {
                type: 'int64',
                id: 50
              },
              headerBytesSent: {
                type: 'int64',
                id: 51
              },
              retransmittedBytesSent: {
                type: 'int64',
                id: 52
              },
              keyFramesEncoded: {
                type: 'int64',
                id: 53
              },
              totalEncodeTime: {
                type: 'double',
                id: 54
              },
              totalEncodedBytesTarget: {
                type: 'int64',
                id: 55
              },
              frameWidth: {
                type: 'int64',
                id: 56
              },
              frameHeight: {
                type: 'int64',
                id: 57
              },
              framesPerSecond: {
                type: 'int64',
                id: 58
              },
              framesSent: {
                type: 'int64',
                id: 59
              },
              totalPacketSendDelay: {
                type: 'double',
                id: 60
              },
              qualityLimitationReason: {
                type: 'string',
                id: 61
              },
              qualityLimitationResolutionChanges: {
                type: 'int64',
                id: 62
              },
              encoderImplementation: {
                type: 'string',
                id: 63
              },
              firCount: {
                type: 'int64',
                id: 64
              },
              pliCount: {
                type: 'int64',
                id: 65
              },
              nackCount: {
                type: 'int64',
                id: 66
              },
              active: {
                type: 'int64',
                id: 67
              },
              jitter: {
                type: 'double',
                id: 68
              },
              localId: {
                type: 'string',
                id: 69
              },
              roundTripTime: {
                type: 'double',
                id: 70
              },
              fractionLost: {
                type: 'int64',
                id: 71
              },
              totalRoundTripTime: {
                type: 'double',
                id: 72
              },
              roundTripTimeMeasurements: {
                type: 'int64',
                id: 73
              },
              frameRateSent: {
                type: 'int64',
                id: 74
              },
              packetsReceived: {
                type: 'int64',
                id: 75
              },
              uid: {
                type: 'int64',
                id: 76
              }
              // qualityLimitationDurations: {
              //   rule: 'repeated',
              //   type: 'quality_limitation_durations_obj',
              //   id: 77,
              //   nested: {
              //     quality_limitation_durations_obj: {
              //       fields: {
              //         other: {
              //           type: 'double',
              //           id: 1
              //         },
              //         cpu: {
              //           type: 'double',
              //           id: 2
              //         },
              //         bandwidth: {
              //           type: 'double',
              //           id: 3
              //         },
              //         none: {
              //           type: 'double',
              //           id: 4
              //         }
              //       }
              //     }
              //   }
              // }
            }
          },
          screen_ssrc_obj: {
            fields: {
              googContentType: {
                type: 'string',
                id: 1
              },
              googFrameWidthInput: {
                type: 'string',
                id: 2
              },
              packetsLost: {
                type: 'int64',
                id: 3
              },
              googRtt: {
                type: 'string',
                id: 4
              },
              googHasEnteredLowResolution: {
                type: 'int64',
                id: 5
              },
              googEncodeUsagePercent: {
                type: 'string',
                id: 6
              },
              googCpuLimitedResolution: {
                type: 'int64',
                id: 7
              },
              hugeFramesSent: {
                type: 'int64',
                id: 8
              },
              googNacksReceived: {
                type: 'string',
                id: 9
              },
              googBandwidthLimitedResolution: {
                type: 'int64',
                id: 10
              },
              googFrameHeightInput: {
                type: 'string',
                id: 11
              },
              googPlisReceived: {
                type: 'string',
                id: 12
              },
              googFrameRateInput: {
                type: 'string',
                id: 13
              },
              googAvgEncodeMs: {
                type: 'string',
                id: 14
              },
              googTrackId: {
                type: 'string',
                id: 15
              },
              codecImplementationName: {
                type: 'string',
                id: 16
              },
              transportId: {
                type: 'string',
                id: 17
              },
              framesEncoded: {
                type: 'int64',
                id: 18
              },
              mediaType: {
                type: 'string',
                id: 19
              },
              googFrameHeightSent: {
                type: 'string',
                id: 20
              },
              googFrameRateSent: {
                type: 'string',
                id: 21
              },
              googCodecName: {
                type: 'string',
                id: 22
              },
              qpSum: {
                type: 'int64',
                id: 23
              },
              googAdaptationChanges: {
                type: 'string',
                id: 24
              },
              ssrc: {
                type: 'int64',
                id: 25
              },
              googFirsReceived: {
                type: 'string',
                id: 26
              },
              googFrameWidthSent: {
                type: 'string',
                id: 27
              },
              packetsSent: {
                type: 'int64',
                id: 28
              },
              bytesSent: {
                type: 'int64',
                id: 29
              },
              id: {
                type: 'string',
                id: 30
              },
              type: {
                type: 'string',
                id: 31
              },
              timestamp: {
                type: 'int64',
                id: 32
              },
              streamType: {
                type: 'string',
                id: 33
              },
              dataId: {
                type: 'int64',
                id: 34
              },
              freezeTime: {
                type: 'int64',
                id: 35
              },
              totalFreezeTime: {
                type: 'int64',
                id: 36
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 37
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 38
              },
              packetsLostPerSecond: {
                type: 'int64',
                id: 39
              },
              sendPacketLoss: {
                type: 'int64',
                id: 40
              },
              packetsLostRate: {
                type: 'int64',
                id: 41
              },
              framesEncodedPerSecond: {
                type: 'int64',
                id: 42
              },
              qpPercentage: {
                type: 'double',
                id: 43
              },
              kind: {
                type: 'string',
                id: 44
              },
              trackId: {
                type: 'string',
                id: 45
              },
              codecId: {
                type: 'string',
                id: 46
              },
              mediaSourceId: {
                type: 'string',
                id: 47
              },
              remoteId: {
                type: 'string',
                id: 48
              },
              mid: {
                type: 'string',
                id: 49
              },
              retransmittedPacketsSent: {
                type: 'int64',
                id: 50
              },
              headerBytesSent: {
                type: 'int64',
                id: 51
              },
              retransmittedBytesSent: {
                type: 'int64',
                id: 52
              },
              keyFramesEncoded: {
                type: 'int64',
                id: 53
              },
              totalEncodeTime: {
                type: 'double',
                id: 54
              },
              totalEncodedBytesTarget: {
                type: 'int64',
                id: 55
              },
              frameWidth: {
                type: 'int64',
                id: 56
              },
              frameHeight: {
                type: 'int64',
                id: 57
              },
              framesPerSecond: {
                type: 'int64',
                id: 58
              },
              framesSent: {
                type: 'int64',
                id: 59
              },
              totalPacketSendDelay: {
                type: 'double',
                id: 60
              },
              qualityLimitationReason: {
                type: 'string',
                id: 61
              },
              qualityLimitationResolutionChanges: {
                type: 'int64',
                id: 62
              },
              encoderImplementation: {
                type: 'string',
                id: 63
              },
              firCount: {
                type: 'int64',
                id: 64
              },
              pliCount: {
                type: 'int64',
                id: 65
              },
              nackCount: {
                type: 'int64',
                id: 66
              },
              active: {
                type: 'int64',
                id: 67
              },
              jitter: {
                type: 'double',
                id: 68
              },
              localId: {
                type: 'string',
                id: 69
              },
              roundTripTime: {
                type: 'double',
                id: 70
              },
              fractionLost: {
                type: 'int64',
                id: 71
              },
              totalRoundTripTime: {
                type: 'double',
                id: 72
              },
              roundTripTimeMeasurements: {
                type: 'int64',
                id: 73
              },
              frameRateSent: {
                type: 'int64',
                id: 74
              },
              packetsReceived: {
                type: 'int64',
                id: 75
              },
              contentType: {
                type: 'string',
                id: 76
              },
              uid: {
                type: 'int64',
                id: 77
              }
              // qualityLimitationDurations: {
              //   rule: 'repeated',
              //   type: 'quality_limitation_durations_obj',
              //   id: 78,
              //   nested: {
              //     quality_limitation_durations_obj: {
              //       fields: {
              //         other: {
              //           type: 'double',
              //           id: 1
              //         },
              //         cpu: {
              //           type: 'double',
              //           id: 2
              //         },
              //         bandwidth: {
              //           type: 'double',
              //           id: 3
              //         },
              //         none: {
              //           type: 'double',
              //           id: 4
              //         }
              //       }
              //     }
              //   }
              // }
            }
          },
          bwe_obj: {
            fields: {
              googActualEncBitrate: {
                type: 'string',
                id: 1
              },
              googAvailableSendBandwidth: {
                type: 'string',
                id: 2
              },
              googRetransmitBitrate: {
                type: 'string',
                id: 3
              },
              googAvailableReceiveBandwidth: {
                type: 'string',
                id: 4
              },
              googTargetEncBitrate: {
                type: 'string',
                id: 5
              },
              googBucketDelay: {
                type: 'string',
                id: 6
              },
              googTransmitBitrate: {
                type: 'string',
                id: 7
              },
              id: {
                type: 'string',
                id: 8
              },
              type: {
                type: 'string',
                id: 9
              },
              timestamp: {
                type: 'int64',
                id: 10
              },
              dataId: {
                type: 'string',
                id: 11
              }
            }
          }
        }
      },
      remote_obj: {
        fields: {
          audio_ssrc: {
            rule: 'repeated',
            type: 'audio_ssrc_obj',
            id: 1
          },
          audioSlave_ssrc: {
            rule: 'repeated',
            type: 'audioSlave_ssrc_obj',
            id: 2
          },
          video_ssrc: {
            rule: 'repeated',
            type: 'video_ssrc_obj',
            id: 3
          },
          screen_ssrc: {
            rule: 'repeated',
            type: 'screen_ssrc_obj',
            id: 4
          },
          bwe: {
            rule: 'repeated',
            type: 'bwe_obj',
            id: 5
          }
        },
        nested: {
          audio_ssrc_obj: {
            fields: {
              googDecodingCTN: {
                type: 'string',
                id: 1
              },
              packetsLost: {
                type: 'int64',
                id: 2
              },
              googSecondaryDecodedRate: {
                type: 'string',
                id: 3
              },
              googDecodingPLC: {
                type: 'string',
                id: 4
              },
              packetsReceived: {
                type: 'int64',
                id: 5
              },
              googDecodingCNG: {
                type: 'string',
                id: 6
              },
              googPreferredJitterBufferMs: {
                type: 'string',
                id: 7
              },
              googSpeechExpandRate: {
                type: 'string',
                id: 8
              },
              totalSamplesDuration: {
                type: 'double',
                id: 9
              },
              googTrackId: {
                type: 'string',
                id: 10
              },
              totalAudioEnergy: {
                type: 'double',
                id: 11
              },
              transportId: {
                type: 'string',
                id: 12
              },
              mediaType: {
                type: 'string',
                id: 13
              },
              googDecodingPLCCNG: {
                type: 'string',
                id: 14
              },
              googCodecName: {
                type: 'string',
                id: 15
              },
              googDecodingNormal: {
                type: 'string',
                id: 16
              },
              googSecondaryDiscardedRate: {
                type: 'string',
                id: 17
              },
              ssrc: {
                type: 'int64',
                id: 18
              },
              audioOutputLevel: {
                type: 'string',
                id: 19
              },
              bytesReceived: {
                type: 'int64',
                id: 20
              },
              googAccelerateRate: {
                type: 'string',
                id: 21
              },
              googCurrentDelayMs: {
                type: 'string',
                id: 22
              },
              googDecodingCTSG: {
                type: 'string',
                id: 23
              },
              googExpandRate: {
                type: 'string',
                id: 24
              },
              googJitterReceived: {
                type: 'string',
                id: 25
              },
              googPreemptiveExpandRate: {
                type: 'string',
                id: 26
              },
              googJitterBufferMs: {
                type: 'string',
                id: 27
              },
              googDecodingMuted: {
                type: 'string',
                id: 28
              },
              id: {
                type: 'string',
                id: 29
              },
              type: {
                type: 'string',
                id: 30
              },
              timestamp: {
                type: 'int64',
                id: 31
              },
              streamType: {
                type: 'string',
                id: 32
              },
              uid: {
                type: 'string',
                id: 33
              },
              dataId: {
                type: 'string',
                id: 34
              },
              freezeTime: {
                type: 'int64',
                id: 35
              },
              totalFreezeTime: {
                type: 'int64',
                id: 36
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 37
              },
              packetsReceivedPerSecond: {
                type: 'int64',
                id: 38
              },
              packetsLostPerSecond: {
                type: 'int64',
                id: 39
              },
              recvPacketLoss: {
                type: 'int64',
                id: 40
              },
              packetsLostRate: {
                type: 'double',
                id: 41
              },
              kind: {
                type: 'string',
                id: 42
              },
              trackId: {
                type: 'string',
                id: 43
              },
              codecId: {
                type: 'string',
                id: 44
              },
              jitter: {
                type: 'double',
                id: 45
              },
              packetsDiscarded: {
                type: 'int64',
                id: 46
              },
              trackIdentifier: {
                type: 'string',
                id: 47
              },
              mid: {
                type: 'string',
                id: 48
              },
              remoteId: {
                type: 'string',
                id: 49
              },
              fecPacketsReceived: {
                type: 'int64',
                id: 50
              },
              fecPacketsDiscarded: {
                type: 'int64',
                id: 51
              },
              headerBytesReceived: {
                type: 'int64',
                id: 52
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 53
              },
              jitterBufferDelay: {
                type: 'int64',
                id: 54
              },
              jitterBufferTargetDelay: {
                type: 'double',
                id: 55
              },
              jitterBufferMinimumDelay: {
                type: 'double',
                id: 56
              },
              jitterBufferEmittedCount: {
                type: 'int64',
                id: 57
              },
              totalSamplesReceived: {
                type: 'int64',
                id: 58
              },
              concealedSamples: {
                type: 'int64',
                id: 59
              },
              silentConcealedSamples: {
                type: 'int64',
                id: 60
              },
              concealmentEvents: {
                type: 'int64',
                id: 61
              },
              insertedSamplesForDeceleration: {
                type: 'int64',
                id: 62
              },
              removedSamplesForAcceleration: {
                type: 'int64',
                id: 63
              },
              audioLevel: {
                type: 'double',
                id: 64
              },
              nackCount: {
                type: 'int64',
                id: 65
              },
              packetsSent: {
                type: 'int64',
                id: 66
              },
              bytesSent: {
                type: 'int64',
                id: 67
              },
              localId: {
                type: 'string',
                id: 68
              },
              remoteTimestamp: {
                type: 'int64',
                id: 69
              },
              reportsSent: {
                type: 'int64',
                id: 70
              },
              roundTripTimeMeasurements: {
                type: 'int64',
                id: 71
              },
              totalRoundTripTime: {
                type: 'int64',
                id: 72
              },
              estimatedPlayoutTimestamp: {
                type: 'int64',
                id: 73
              },
              googDecodingNormalPerSecond: {
                type: 'int64',
                id: 74
              }
            }
          },
          audioSlave_ssrc_obj: {
            fields: {
              googDecodingCTN: {
                type: 'string',
                id: 1
              },
              packetsLost: {
                type: 'int64',
                id: 2
              },
              googSecondaryDecodedRate: {
                type: 'string',
                id: 3
              },
              googDecodingPLC: {
                type: 'string',
                id: 4
              },
              packetsReceived: {
                type: 'int64',
                id: 5
              },
              googDecodingCNG: {
                type: 'string',
                id: 6
              },
              googPreferredJitterBufferMs: {
                type: 'string',
                id: 7
              },
              googSpeechExpandRate: {
                type: 'string',
                id: 8
              },
              totalSamplesDuration: {
                type: 'double',
                id: 9
              },
              googTrackId: {
                type: 'string',
                id: 10
              },
              totalAudioEnergy: {
                type: 'double',
                id: 11
              },
              transportId: {
                type: 'string',
                id: 12
              },
              mediaType: {
                type: 'string',
                id: 13
              },
              googDecodingPLCCNG: {
                type: 'string',
                id: 14
              },
              googCodecName: {
                type: 'string',
                id: 15
              },
              googDecodingNormal: {
                type: 'string',
                id: 16
              },
              googSecondaryDiscardedRate: {
                type: 'string',
                id: 17
              },
              ssrc: {
                type: 'int64',
                id: 18
              },
              audioOutputLevel: {
                type: 'string',
                id: 19
              },
              bytesReceived: {
                type: 'int64',
                id: 20
              },
              googAccelerateRate: {
                type: 'string',
                id: 21
              },
              googCurrentDelayMs: {
                type: 'string',
                id: 22
              },
              googDecodingCTSG: {
                type: 'string',
                id: 23
              },
              googExpandRate: {
                type: 'string',
                id: 24
              },
              googJitterReceived: {
                type: 'string',
                id: 25
              },
              googPreemptiveExpandRate: {
                type: 'string',
                id: 26
              },
              googJitterBufferMs: {
                type: 'string',
                id: 27
              },
              googDecodingMuted: {
                type: 'string',
                id: 28
              },
              id: {
                type: 'string',
                id: 29
              },
              type: {
                type: 'string',
                id: 30
              },
              timestamp: {
                type: 'int64',
                id: 31
              },
              streamType: {
                type: 'string',
                id: 32
              },
              uid: {
                type: 'string',
                id: 33
              },
              dataId: {
                type: 'string',
                id: 34
              },
              freezeTime: {
                type: 'int64',
                id: 35
              },
              totalFreezeTime: {
                type: 'int64',
                id: 36
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 37
              },
              packetsReceivedPerSecond: {
                type: 'int64',
                id: 38
              },
              packetsLostPerSecond: {
                type: 'int64',
                id: 39
              },
              recvPacketLoss: {
                type: 'int64',
                id: 40
              },
              packetsLostRate: {
                type: 'double',
                id: 41
              },
              kind: {
                type: 'string',
                id: 42
              },
              trackId: {
                type: 'string',
                id: 43
              },
              codecId: {
                type: 'string',
                id: 44
              },
              jitter: {
                type: 'double',
                id: 45
              },
              packetsDiscarded: {
                type: 'int64',
                id: 46
              },
              trackIdentifier: {
                type: 'string',
                id: 47
              },
              mid: {
                type: 'string',
                id: 48
              },
              remoteId: {
                type: 'string',
                id: 49
              },
              fecPacketsReceived: {
                type: 'int64',
                id: 50
              },
              fecPacketsDiscarded: {
                type: 'int64',
                id: 51
              },
              headerBytesReceived: {
                type: 'int64',
                id: 52
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 53
              },
              jitterBufferDelay: {
                type: 'int64',
                id: 54
              },
              jitterBufferTargetDelay: {
                type: 'double',
                id: 55
              },
              jitterBufferMinimumDelay: {
                type: 'double',
                id: 56
              },
              jitterBufferEmittedCount: {
                type: 'int64',
                id: 57
              },
              totalSamplesReceived: {
                type: 'int64',
                id: 58
              },
              concealedSamples: {
                type: 'int64',
                id: 59
              },
              silentConcealedSamples: {
                type: 'int64',
                id: 60
              },
              concealmentEvents: {
                type: 'int64',
                id: 61
              },
              insertedSamplesForDeceleration: {
                type: 'int64',
                id: 62
              },
              removedSamplesForAcceleration: {
                type: 'int64',
                id: 63
              },
              audioLevel: {
                type: 'double',
                id: 64
              },
              nackCount: {
                type: 'int64',
                id: 65
              },
              packetsSent: {
                type: 'int64',
                id: 66
              },
              bytesSent: {
                type: 'int64',
                id: 67
              },
              localId: {
                type: 'string',
                id: 68
              },
              remoteTimestamp: {
                type: 'int64',
                id: 69
              },
              reportsSent: {
                type: 'int64',
                id: 70
              },
              roundTripTimeMeasurements: {
                type: 'int64',
                id: 71
              },
              totalRoundTripTime: {
                type: 'int64',
                id: 72
              },
              googDecodingNormalPerSecond: {
                type: 'int64',
                id: 73
              }
            }
          },
          video_ssrc_obj: {
            fields: {
              googContentType: {
                type: 'string',
                id: 1
              },
              googCaptureStartNtpTimeMs: {
                type: 'string',
                id: 2
              },
              googTargetDelayMs: {
                type: 'string',
                id: 3
              },
              packetsLost: {
                type: 'int64',
                id: 4
              },
              googDecodeMs: {
                type: 'string',
                id: 5
              },
              googFrameHeightReceived: {
                type: 'string',
                id: 6
              },
              packetsReceived: {
                type: 'int64',
                id: 7
              },
              googMaxDecodeMs: {
                type: 'string',
                id: 8
              },
              googTrackId: {
                type: 'string',
                id: 9
              },
              googFrameWidthReceived: {
                type: 'string',
                id: 10
              },
              codecImplementationName: {
                type: 'string',
                id: 11
              },
              transportId: {
                type: 'string',
                id: 12
              },
              mediaType: {
                type: 'string',
                id: 13
              },
              googInterframeDelayMax: {
                type: 'string',
                id: 14
              },
              googCodecName: {
                type: 'string',
                id: 15
              },
              googFrameRateReceived: {
                type: 'string',
                id: 16
              },
              googMinPlayoutDelayMs: {
                type: 'string',
                id: 17
              },
              framesDecoded: {
                type: 'int64',
                id: 18
              },
              googNacksSent: {
                type: 'string',
                id: 19
              },
              ssrc: {
                type: 'int64',
                id: 20
              },
              bytesReceived: {
                type: 'int64',
                id: 21
              },
              googFirstFrameReceivedToDecodedMs: {
                type: 'string',
                id: 22
              },
              googCurrentDelayMs: {
                type: 'string',
                id: 23
              },
              googRenderDelayMs: {
                type: 'string',
                id: 24
              },
              googFirsSent: {
                type: 'string',
                id: 25
              },
              googFrameRateDecoded: {
                type: 'string',
                id: 26
              },
              googFrameRateOutput: {
                type: 'string',
                id: 27
              },
              googJitterBufferMs: {
                type: 'string',
                id: 28
              },
              googPlisSent: {
                type: 'string',
                id: 29
              },
              id: {
                type: 'string',
                id: 30
              },
              type: {
                type: 'string',
                id: 31
              },
              timestamp: {
                type: 'int64',
                id: 32
              },
              streamType: {
                type: 'string',
                id: 33
              },
              uid: {
                type: 'string',
                id: 34
              },
              dataId: {
                type: 'string',
                id: 35
              },
              freezeTime: {
                type: 'int64',
                id: 36
              },
              totalFreezeTime: {
                type: 'int64',
                id: 37
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 38
              },
              packetsReceivedPerSecond: {
                type: 'double',
                id: 39
              },
              packetsLostPerSecond: {
                type: 'double',
                id: 40
              },
              recvPacketLoss: {
                type: 'int64',
                id: 41
              },
              framesDecodedPerSecond: {
                type: 'double',
                id: 42
              },
              kind: {
                type: 'string',
                id: 43
              },
              trackId: {
                type: 'string',
                id: 44
              },
              codecId: {
                type: 'string',
                id: 45
              },
              jitter: {
                type: 'double',
                id: 46
              },
              trackIdentifier: {
                type: 'string',
                id: 47
              },
              mid: {
                type: 'string',
                id: 48
              },
              headerBytesReceived: {
                type: 'int64',
                id: 49
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 50
              },
              jitterBufferDelay: {
                type: 'double',
                id: 51
              },
              jitterBufferEmittedCount: {
                type: 'int64',
                id: 52
              },
              framesReceived: {
                type: 'int64',
                id: 53
              },
              frameWidth: {
                type: 'int64',
                id: 54
              },
              frameHeight: {
                type: 'int64',
                id: 55
              },
              framesPerSecond: {
                type: 'int64',
                id: 56
              },
              keyFramesDecoded: {
                type: 'int64',
                id: 57
              },
              framesDropped: {
                type: 'int64',
                id: 58
              },
              totalDecodeTime: {
                type: 'double',
                id: 59
              },
              totalProcessingDelay: {
                type: 'double',
                id: 60
              },
              totalInterFrameDelay: {
                type: 'double',
                id: 61
              },
              totalSquaredInterFrameDelay: {
                type: 'double',
                id: 62
              },
              estimatedPlayoutTimestamp: {
                type: 'int64',
                id: 63
              },
              decoderImplementation: {
                type: 'string',
                id: 64
              },
              firCount: {
                type: 'int64',
                id: 65
              },
              pliCount: {
                type: 'int64',
                id: 66
              },
              nackCount: {
                type: 'int64',
                id: 67
              },
              discardedPackets: {
                type: 'int64',
                id: 68
              },
              packetsDiscarded: {
                type: 'int64',
                id: 69
              },
              remoteId: {
                type: 'string',
                id: 70
              },
              bytesSent: {
                type: 'int64',
                id: 71
              },
              packetsSent: {
                type: 'int64',
                id: 72
              },
              localId: {
                type: 'string',
                id: 73
              },
              remoteTimestamp: {
                type: 'int64',
                id: 74
              },
              packetsLostRate: {
                type: 'double',
                id: 75
              },
              frameRateReceived: {
                type: 'double',
                id: 76
              }
            }
          },
          screen_ssrc_obj: {
            fields: {
              googContentType: {
                type: 'string',
                id: 1
              },
              googCaptureStartNtpTimeMs: {
                type: 'string',
                id: 2
              },
              googTargetDelayMs: {
                type: 'string',
                id: 3
              },
              packetsLost: {
                type: 'int64',
                id: 4
              },
              googDecodeMs: {
                type: 'string',
                id: 5
              },
              googFrameHeightReceived: {
                type: 'string',
                id: 6
              },
              packetsReceived: {
                type: 'int64',
                id: 7
              },
              googMaxDecodeMs: {
                type: 'string',
                id: 8
              },
              googTrackId: {
                type: 'string',
                id: 9
              },
              googFrameWidthReceived: {
                type: 'string',
                id: 10
              },
              codecImplementationName: {
                type: 'string',
                id: 11
              },
              transportId: {
                type: 'string',
                id: 12
              },
              mediaType: {
                type: 'string',
                id: 13
              },
              googInterframeDelayMax: {
                type: 'string',
                id: 14
              },
              googCodecName: {
                type: 'string',
                id: 15
              },
              googFrameRateReceived: {
                type: 'string',
                id: 16
              },
              googMinPlayoutDelayMs: {
                type: 'string',
                id: 17
              },
              framesDecoded: {
                type: 'int64',
                id: 18
              },
              googNacksSent: {
                type: 'string',
                id: 19
              },
              ssrc: {
                type: 'int64',
                id: 20
              },
              bytesReceived: {
                type: 'int64',
                id: 21
              },
              googFirstFrameReceivedToDecodedMs: {
                type: 'string',
                id: 22
              },
              googCurrentDelayMs: {
                type: 'string',
                id: 23
              },
              googRenderDelayMs: {
                type: 'string',
                id: 24
              },
              googFirsSent: {
                type: 'string',
                id: 25
              },
              googFrameRateDecoded: {
                type: 'string',
                id: 26
              },
              googFrameRateOutput: {
                type: 'string',
                id: 27
              },
              googJitterBufferMs: {
                type: 'string',
                id: 28
              },
              googPlisSent: {
                type: 'string',
                id: 29
              },
              id: {
                type: 'string',
                id: 30
              },
              type: {
                type: 'string',
                id: 31
              },
              timestamp: {
                type: 'int64',
                id: 32
              },
              streamType: {
                type: 'string',
                id: 33
              },
              uid: {
                type: 'string',
                id: 34
              },
              dataId: {
                type: 'string',
                id: 35
              },
              freezeTime: {
                type: 'int64',
                id: 36
              },
              totalFreezeTime: {
                type: 'int64',
                id: 37
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 38
              },
              packetsReceivedPerSecond: {
                type: 'double',
                id: 39
              },
              packetsLostPerSecond: {
                type: 'double',
                id: 40
              },
              recvPacketLoss: {
                type: 'int64',
                id: 41
              },
              framesDecodedPerSecond: {
                type: 'double',
                id: 42
              },
              kind: {
                type: 'string',
                id: 43
              },
              trackId: {
                type: 'string',
                id: 44
              },
              codecId: {
                type: 'string',
                id: 45
              },
              jitter: {
                type: 'double',
                id: 46
              },
              trackIdentifier: {
                type: 'string',
                id: 47
              },
              mid: {
                type: 'string',
                id: 48
              },
              headerBytesReceived: {
                type: 'int64',
                id: 49
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 50
              },
              jitterBufferDelay: {
                type: 'double',
                id: 51
              },
              jitterBufferEmittedCount: {
                type: 'int64',
                id: 52
              },
              framesReceived: {
                type: 'int64',
                id: 53
              },
              frameWidth: {
                type: 'int64',
                id: 54
              },
              frameHeight: {
                type: 'int64',
                id: 55
              },
              framesPerSecond: {
                type: 'int64',
                id: 56
              },
              keyFramesDecoded: {
                type: 'int64',
                id: 57
              },
              framesDropped: {
                type: 'int64',
                id: 58
              },
              totalDecodeTime: {
                type: 'double',
                id: 59
              },
              totalProcessingDelay: {
                type: 'double',
                id: 60
              },
              totalInterFrameDelay: {
                type: 'double',
                id: 61
              },
              totalSquaredInterFrameDelay: {
                type: 'double',
                id: 62
              },
              estimatedPlayoutTimestamp: {
                type: 'int64',
                id: 63
              },
              decoderImplementation: {
                type: 'string',
                id: 64
              },
              firCount: {
                type: 'int64',
                id: 65
              },
              pliCount: {
                type: 'int64',
                id: 66
              },
              nackCount: {
                type: 'int64',
                id: 67
              },
              discardedPackets: {
                type: 'int64',
                id: 68
              },
              packetsDiscarded: {
                type: 'int64',
                id: 69
              },
              remoteId: {
                type: 'string',
                id: 70
              },
              bytesSent: {
                type: 'int64',
                id: 71
              },
              packetsSent: {
                type: 'int64',
                id: 72
              },
              localId: {
                type: 'string',
                id: 73
              },
              remoteTimestamp: {
                type: 'int64',
                id: 74
              },
              packetsLostRate: {
                type: 'double',
                id: 75
              },
              frameRateReceived: {
                type: 'double',
                id: 76
              }
            }
          },
          bwe_obj: {
            fields: {
              googActualEncBitrate: {
                type: 'string',
                id: 1
              },
              googAvailableSendBandwidth: {
                type: 'string',
                id: 2
              },
              googRetransmitBitrate: {
                type: 'string',
                id: 3
              },
              googAvailableReceiveBandwidth: {
                type: 'string',
                id: 4
              },
              googTargetEncBitrate: {
                type: 'string',
                id: 5
              },
              googBucketDelay: {
                type: 'string',
                id: 6
              },
              googTransmitBitrate: {
                type: 'string',
                id: 7
              },
              id: {
                type: 'string',
                id: 8
              },
              type: {
                type: 'string',
                id: 9
              },
              timestamp: {
                type: 'int64',
                id: 10
              },
              dataId: {
                type: 'string',
                id: 11
              }
            }
          }
        }
      }
    }
  }
})

module.exports = $root

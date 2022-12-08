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
        type: 'string',
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
                type: 'int64',
                id: 1
              },
              totalAudioEnergy: {
                type: 'int64',
                id: 2
              },
              totalSamplesDuration: {
                type: 'int64',
                id: 3
              },
              bytesSent: {
                type: 'int64',
                id: 4
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 5
              },
              targetBitrate: {
                type: 'int64',
                id: 6
              },
              packetsSent: {
                type: 'int64',
                id: 7
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 8
              },
              packetsLost: {
                type: 'int64',
                id: 9
              },
              fractionLost: {
                type: 'int64',
                id: 10
              },
              packetsLostRate: {
                type: 'int64',
                id: 11
              },
              nackCount: {
                type: 'int64',
                id: 12
              },
              rtt: {
                type: 'int64',
                id: 13
              },
              jitterReceived: {
                type: 'int64',
                id: 14
              },
              echoReturnLoss: {
                type: 'string',
                id: 15
              },
              echoReturnLossEnhancement: {
                type: 'string',
                id: 16
              },
              active: {
                type: 'int64',
                id: 17
              }
            }
          },
          audioSlave_ssrc_obj: {
            fields: {
              audioInputLevel: {
                type: 'int64',
                id: 1
              },
              totalAudioEnergy: {
                type: 'int64',
                id: 2
              },
              totalSamplesDuration: {
                type: 'int64',
                id: 3
              },
              bytesSent: {
                type: 'int64',
                id: 4
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 5
              },
              targetBitrate: {
                type: 'int64',
                id: 6
              },
              packetsSent: {
                type: 'int64',
                id: 7
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 8
              },
              packetsLost: {
                type: 'int64',
                id: 9
              },
              fractionLost: {
                type: 'int64',
                id: 10
              },
              packetsLostRate: {
                type: 'int64',
                id: 11
              },
              nackCount: {
                type: 'int64',
                id: 12
              },
              rtt: {
                type: 'int64',
                id: 13
              },
              jitterReceived: {
                type: 'int64',
                id: 14
              },
              echoReturnLoss: {
                type: 'string',
                id: 15
              },
              echoReturnLossEnhancement: {
                type: 'string',
                id: 16
              },
              active: {
                type: 'int64',
                id: 17
              }
            }
          },
          video_ssrc_obj: {
            fields: {
              bytesSent: {
                type: 'int64',
                id: 1
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 2
              },
              targetBitrate: {
                type: 'int64',
                id: 3
              },
              packetsSent: {
                type: 'int64',
                id: 4
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 5
              },
              packetsLost: {
                type: 'int64',
                id: 6
              },
              fractionLost: {
                type: 'int64',
                id: 7
              },
              packetsLostRate: {
                type: 'int64',
                id: 8
              },
              firCount: {
                type: 'int64',
                id: 9
              },
              pliCount: {
                type: 'int64',
                id: 10
              },
              nackCount: {
                type: 'int64',
                id: 11
              },
              framesEncoded: {
                type: 'int64',
                id: 12
              },
              framesEncodedPerSecond: {
                type: 'int64',
                id: 13
              },
              avgEncodeMs: {
                type: 'int64',
                id: 14
              },
              encodeUsagePercent: {
                type: 'int64',
                id: 15
              },
              framesSent: {
                type: 'int64',
                id: 16
              },
              frameRateInput: {
                type: 'int64',
                id: 17
              },
              frameRateSent: {
                type: 'int64',
                id: 18
              },
              frameWidthInput: {
                type: 'int64',
                id: 19
              },
              frameWidthSent: {
                type: 'int64',
                id: 20
              },
              frameHeightInput: {
                type: 'int64',
                id: 21
              },
              frameHeightSent: {
                type: 'int64',
                id: 22
              },
              hugeFramesSent: {
                type: 'int64',
                id: 23
              },
              qpSum: {
                type: 'int64',
                id: 24
              },
              qpPercentage: {
                type: 'int64',
                id: 25
              },
              freezeTime: {
                type: 'int64',
                id: 26
              },
              totalFreezeTime: {
                type: 'int64',
                id: 27
              },
              qualityLimitationReason: {
                type: 'string',
                id: 28
              },
              qualityLimitationResolutionChanges: {
                type: 'int64',
                id: 29
              },
              jitter: {
                type: 'int64',
                id: 30
              },
              rtt: {
                type: 'int64',
                id: 31
              },
              active: {
                type: 'int64',
                id: 32
              },
              streamType: {
                type: 'string',
                id: 33
              }
            }
          },
          screen_ssrc_obj: {
            fields: {
              bytesSent: {
                type: 'int64',
                id: 1
              },
              bitsSentPerSecond: {
                type: 'int64',
                id: 2
              },
              targetBitrate: {
                type: 'int64',
                id: 3
              },
              packetsSent: {
                type: 'int64',
                id: 4
              },
              packetsSentPerSecond: {
                type: 'int64',
                id: 5
              },
              packetsLost: {
                type: 'int64',
                id: 6
              },
              fractionLost: {
                type: 'int64',
                id: 7
              },
              packetsLostRate: {
                type: 'int64',
                id: 8
              },
              firCount: {
                type: 'int64',
                id: 9
              },
              pliCount: {
                type: 'int64',
                id: 10
              },
              nackCount: {
                type: 'int64',
                id: 11
              },
              framesEncoded: {
                type: 'int64',
                id: 12
              },
              framesEncodedPerSecond: {
                type: 'int64',
                id: 13
              },
              avgEncodeMs: {
                type: 'int64',
                id: 14
              },
              encodeUsagePercent: {
                type: 'int64',
                id: 15
              },
              framesSent: {
                type: 'int64',
                id: 16
              },
              frameRateInput: {
                type: 'int64',
                id: 17
              },
              frameRateSent: {
                type: 'int64',
                id: 18
              },
              frameWidthInput: {
                type: 'int64',
                id: 19
              },
              frameWidthSent: {
                type: 'int64',
                id: 20
              },
              frameHeightInput: {
                type: 'int64',
                id: 21
              },
              frameHeightSent: {
                type: 'int64',
                id: 22
              },
              hugeFramesSent: {
                type: 'int64',
                id: 23
              },
              qpSum: {
                type: 'int64',
                id: 24
              },
              qpPercentage: {
                type: 'int64',
                id: 25
              },
              freezeTime: {
                type: 'int64',
                id: 26
              },
              totalFreezeTime: {
                type: 'int64',
                id: 27
              },
              qualityLimitationReason: {
                type: 'string',
                id: 28
              },
              qualityLimitationResolutionChanges: {
                type: 'int64',
                id: 29
              },
              jitter: {
                type: 'int64',
                id: 30
              },
              rtt: {
                type: 'int64',
                id: 31
              },
              active: {
                type: 'int64',
                id: 32
              },
              streamType: {
                type: 'string',
                id: 33
              }
            }
          },
          bwe_obj: {
            fields: {
              googActualEncBitrate: {
                type: 'int64',
                id: 1
              },
              googAvailableSendBandwidth: {
                type: 'int64',
                id: 2
              },
              googRetransmitBitrate: {
                type: 'int64',
                id: 3
              },
              googAvailableReceiveBandwidth: {
                type: 'int64',
                id: 4
              },
              googTargetEncBitrate: {
                type: 'int64',
                id: 5
              },
              googBucketDelay: {
                type: 'int64',
                id: 6
              },
              googTransmitBitrate: {
                type: 'int64',
                id: 7
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
          }
        },
        nested: {
          audio_ssrc_obj: {
            fields: {
              audioOutputLevel: {
                type: 'int64',
                id: 1
              },
              totalAudioEnergy: {
                type: 'int64',
                id: 2
              },
              totalSamplesDuration: {
                type: 'int64',
                id: 3
              },
              bytesReceived: {
                type: 'int64',
                id: 4
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 5
              },
              packetsReceived: {
                type: 'int64',
                id: 6
              },
              packetsReceivedPerSecond: {
                type: 'int64',
                id: 7
              },
              packetsLost: {
                type: 'int64',
                id: 8
              },
              packetsLostRate: {
                type: 'int64',
                id: 9
              },
              nackCount: {
                type: 'int64',
                id: 10
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 11
              },
              estimatedPlayoutTimestamp: {
                type: 'int64',
                id: 12
              },
              freezeTime: {
                type: 'int64',
                id: 13
              },
              totalFreezeTime: {
                type: 'int64',
                id: 14
              },
              decodingPLC: {
                type: 'int64',
                id: 15
              },
              decodingPLCCNG: {
                type: 'int64',
                id: 16
              },
              decodingNormal: {
                type: 'int64',
                id: 17
              },
              decodingMuted: {
                type: 'int64',
                id: 18
              },
              decodingCNG: {
                type: 'int64',
                id: 19
              },
              decodingCTN: {
                type: 'int64',
                id: 20
              },
              currentDelayMs: {
                type: 'int64',
                id: 21
              },
              preferredJitterBufferMs: {
                type: 'int64',
                id: 22
              },
              jitterBufferMs: {
                type: 'int64',
                id: 23
              },
              jitterBufferDelay: {
                type: 'int64',
                id: 24
              },
              jitter: {
                type: 'int64',
                id: 25
              },
              rtt: {
                type: 'int64',
                id: 26
              },
              preemptiveExpandRate: {
                type: 'int64',
                id: 27
              },
              speechExpandRate: {
                type: 'int64',
                id: 28
              },
              concealedSamples: {
                type: 'int64',
                id: 29
              },
              silentConcealedSamples: {
                type: 'int64',
                id: 30
              },
              secondaryDecodedRate: {
                type: 'int64',
                id: 31
              },
              secondaryDiscardedRate: {
                type: 'int64',
                id: 32
              },
              remoteuid: {
                type: 'string',
                id: 33
              }
            }
          },
          audioSlave_ssrc_obj: {
            fields: {
              audioOutputLevel: {
                type: 'int64',
                id: 1
              },
              totalAudioEnergy: {
                type: 'int64',
                id: 2
              },
              totalSamplesDuration: {
                type: 'int64',
                id: 3
              },
              bytesReceived: {
                type: 'int64',
                id: 4
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 5
              },
              packetsReceived: {
                type: 'int64',
                id: 6
              },
              packetsReceivedPerSecond: {
                type: 'int64',
                id: 7
              },
              packetsLost: {
                type: 'int64',
                id: 8
              },
              packetsLostRate: {
                type: 'int64',
                id: 9
              },
              nackCount: {
                type: 'int64',
                id: 10
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 11
              },
              estimatedPlayoutTimestamp: {
                type: 'int64',
                id: 12
              },
              freezeTime: {
                type: 'int64',
                id: 13
              },
              totalFreezeTime: {
                type: 'int64',
                id: 14
              },
              decodingPLC: {
                type: 'int64',
                id: 15
              },
              decodingPLCCNG: {
                type: 'int64',
                id: 16
              },
              decodingNormal: {
                type: 'int64',
                id: 17
              },
              decodingMuted: {
                type: 'int64',
                id: 18
              },
              decodingCNG: {
                type: 'int64',
                id: 19
              },
              decodingCTN: {
                type: 'int64',
                id: 20
              },
              currentDelayMs: {
                type: 'int64',
                id: 21
              },
              preferredJitterBufferMs: {
                type: 'int64',
                id: 22
              },
              jitterBufferMs: {
                type: 'int64',
                id: 23
              },
              jitterBufferDelay: {
                type: 'int64',
                id: 24
              },
              jitter: {
                type: 'int64',
                id: 25
              },
              rtt: {
                type: 'int64',
                id: 26
              },
              preemptiveExpandRate: {
                type: 'int64',
                id: 27
              },
              speechExpandRate: {
                type: 'int64',
                id: 28
              },
              concealedSamples: {
                type: 'int64',
                id: 29
              },
              silentConcealedSamples: {
                type: 'int64',
                id: 30
              },
              secondaryDecodedRate: {
                type: 'int64',
                id: 31
              },
              secondaryDiscardedRate: {
                type: 'int64',
                id: 32
              },
              remoteuid: {
                type: 'string',
                id: 33
              }
            }
          },
          video_ssrc_obj: {
            fields: {
              bytesReceived: {
                type: 'int64',
                id: 1
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 2
              },
              packetsReceived: {
                type: 'int64',
                id: 3
              },
              packetsReceivedPerSecond: {
                type: 'int64',
                id: 4
              },
              packetsLost: {
                type: 'int64',
                id: 5
              },
              packetsLostRate: {
                type: 'int64',
                id: 6
              },
              firCount: {
                type: 'int64',
                id: 7
              },
              pliCount: {
                type: 'int64',
                id: 8
              },
              nackCount: {
                type: 'int64',
                id: 9
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 10
              },
              estimatedPlayoutTimestamp: {
                type: 'int64',
                id: 11
              },
              pauseCount: {
                type: 'int64',
                id: 12
              },
              totalPausesDuration: {
                type: 'int64',
                id: 13
              },
              freezeCount: {
                type: 'int64',
                id: 14
              },
              totalFreezesDuration: {
                type: 'int64',
                id: 15
              },
              totalFreezeTime: {
                type: 'int64',
                id: 16
              },
              freezeTime: {
                type: 'int64',
                id: 17
              },
              framesDecoded: {
                type: 'int64',
                id: 18
              },
              framesDropped: {
                type: 'int64',
                id: 19
              },
              framesReceived: {
                type: 'int64',
                id: 20
              },
              decodeMs: {
                type: 'int64',
                id: 21
              },
              frameRateDecoded: {
                type: 'int64',
                id: 22
              },
              frameRateOutput: {
                type: 'int64',
                id: 23
              },
              frameRateReceived: {
                type: 'int64',
                id: 24
              },
              frameWidthReceived: {
                type: 'int64',
                id: 25
              },
              frameHeightReceived: {
                type: 'int64',
                id: 26
              },
              powerEfficientDecoder: {
                type: 'int64',
                id: 27
              },
              currentDelayMs: {
                type: 'int64',
                id: 28
              },
              jitterBufferDelay: {
                type: 'int64',
                id: 29
              },
              remoteuid: {
                type: 'string',
                id: 30
              }
            }
          },
          screen_ssrc_obj: {
            fields: {
              bytesReceived: {
                type: 'int64',
                id: 1
              },
              bitsReceivedPerSecond: {
                type: 'int64',
                id: 2
              },
              packetsReceived: {
                type: 'int64',
                id: 3
              },
              packetsReceivedPerSecond: {
                type: 'int64',
                id: 4
              },
              packetsLost: {
                type: 'int64',
                id: 5
              },
              packetsLostRate: {
                type: 'int64',
                id: 6
              },
              firCount: {
                type: 'int64',
                id: 7
              },
              pliCount: {
                type: 'int64',
                id: 8
              },
              nackCount: {
                type: 'int64',
                id: 9
              },
              lastPacketReceivedTimestamp: {
                type: 'int64',
                id: 10
              },
              estimatedPlayoutTimestamp: {
                type: 'int64',
                id: 11
              },
              pauseCount: {
                type: 'int64',
                id: 12
              },
              totalPausesDuration: {
                type: 'int64',
                id: 13
              },
              freezeCount: {
                type: 'int64',
                id: 14
              },
              totalFreezesDuration: {
                type: 'int64',
                id: 15
              },
              totalFreezeTime: {
                type: 'int64',
                id: 16
              },
              freezeTime: {
                type: 'int64',
                id: 17
              },
              framesDecoded: {
                type: 'int64',
                id: 18
              },
              framesDropped: {
                type: 'int64',
                id: 19
              },
              framesReceived: {
                type: 'int64',
                id: 20
              },
              decodeMs: {
                type: 'int64',
                id: 21
              },
              frameRateDecoded: {
                type: 'int64',
                id: 22
              },
              frameRateOutput: {
                type: 'int64',
                id: 23
              },
              frameRateReceived: {
                type: 'int64',
                id: 24
              },
              frameWidthReceived: {
                type: 'int64',
                id: 25
              },
              frameHeightReceived: {
                type: 'int64',
                id: 26
              },
              powerEfficientDecoder: {
                type: 'int64',
                id: 27
              },
              currentDelayMs: {
                type: 'int64',
                id: 28
              },
              jitterBufferDelay: {
                type: 'int64',
                id: 29
              },
              remoteuid: {
                type: 'string',
                id: 30
              }
            }
          }
        }
      }
    }
  }
})

module.exports = $root

/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/light");

var $root = ($protobuf.roots["default"] || ($protobuf.roots["default"] = new $protobuf.Root()))
.addJSON({
  WebrtcStats: {
    fields: {
      local: {
        type: "local_obj",
        id: 1
      },
      remote: {
        type: "remote_obj",
        id: 2
      },
      timestamp: {
        type: "int64",
        id: 3
      }
    },
    nested: {
      local_obj: {
        fields: {
          video_bwe: {
            rule: "repeated",
            type: "video_bwe_obj",
            id: 1
          },
          audio_ssrc: {
            rule: "repeated",
            type: "audio_ssrc_obj",
            id: 2
          },
          video_ssrc: {
            rule: "repeated",
            type: "video_ssrc_obj",
            id: 3
          },
          media_source: {
            rule: "repeated",
            type: "media_source_obj",
            id: 4
          },
          candidate_pair: {
            rule: "repeated",
            type: "candidate_pair_obj",
            id: 5
          },
          local_candidate: {
            rule: "repeated",
            type: "local_candidate_obj",
            id: 6
          },
          remote_candidate: {
            rule: "repeated",
            type: "remote_candidate_obj",
            id: 7
          },
          track: {
            rule: "repeated",
            type: "track_obj",
            id: 8
          },
          outbound_rtp: {
            rule: "repeated",
            type: "outbound_rtp_obj",
            id: 9
          },
          remote_inbound_rtp: {
            rule: "repeated",
            type: "remote_inbound_rtp_obj",
            id: 10
          },
          transport: {
            rule: "repeated",
            type: "transport_obj",
            id: 11
          },
          audio_track: {
            rule: "repeated",
            type: "audio_track_obj",
            id: 12
          },
          video_track: {
            rule: "repeated",
            type: "video_track_obj",
            id: 13
          },
          audio_outbound_rtp: {
            rule: "repeated",
            type: "audio_outbound_rtp_obj",
            id: 14
          },
          video_outbound_rtp: {
            rule: "repeated",
            type: "video_outbound_rtp_obj",
            id: 15
          }
        },
        nested: {
          video_bwe_obj: {
            fields: {
              googActualEncBitrate: {
                type: "string",
                id: 1
              },
              googAvailableSendBandwidth: {
                type: "string",
                id: 2
              },
              googRetransmitBitrate: {
                type: "string",
                id: 3
              },
              googAvailableReceiveBandwidth: {
                type: "string",
                id: 4
              },
              googTargetEncBitrate: {
                type: "string",
                id: 5
              },
              googBucketDelay: {
                type: "string",
                id: 6
              },
              googTransmitBitrate: {
                type: "string",
                id: 7
              },
              id: {
                type: "string",
                id: 8
              },
              type: {
                type: "string",
                id: 9
              },
              timestamp: {
                type: "string",
                id: 10
              }
            }
          },
          audio_ssrc_obj: {
            fields: {
              audioInputLevel: {
                type: "string",
                id: 1
              },
              packetsLost: {
                type: "string",
                id: 2
              },
              googRtt: {
                type: "string",
                id: 3
              },
              totalSamplesDuration: {
                type: "string",
                id: 4
              },
              googEchoCancellationReturnLossEnhancement: {
                type: "string",
                id: 5
              },
              googTrackId: {
                type: "string",
                id: 6
              },
              totalAudioEnergy: {
                type: "string",
                id: 7
              },
              transportId: {
                type: "string",
                id: 8
              },
              mediaType: {
                type: "string",
                id: 9
              },
              googEchoCancellationReturnLoss: {
                type: "string",
                id: 10
              },
              googCodecName: {
                type: "string",
                id: 11
              },
              ssrc: {
                type: "string",
                id: 12
              },
              googJitterReceived: {
                type: "string",
                id: 13
              },
              googTypingNoiseState: {
                type: "string",
                id: 14
              },
              packetsSent: {
                type: "string",
                id: 15
              },
              bytesSent: {
                type: "string",
                id: 16
              },
              id: {
                type: "string",
                id: 17
              },
              type: {
                type: "string",
                id: 18
              },
              timestamp: {
                type: "string",
                id: 19
              },
              localuid: {
                type: "int64",
                id: 20
              },
              remoteuid: {
                type: "int64",
                id: 21
              },
              bitsSentPerSecond: {
                type: "int64",
                id: 22
              },
              packetsSentPerSecond: {
                type: "int64",
                id: 23
              },
              sendPacketLoss: {
                type: "int64",
                id: 24
              }
            }
          },
          video_ssrc_obj: {
            fields: {
              googContentType: {
                type: "string",
                id: 1
              },
              googFrameWidthInput: {
                type: "string",
                id: 2
              },
              googFrameWidthSent: {
                type: "string",
                id: 3
              },
              packetsLost: {
                type: "string",
                id: 4
              },
              googRtt: {
                type: "string",
                id: 5
              },
              googHasEnteredLowResolution: {
                type: "string",
                id: 6
              },
              googEncodeUsagePercent: {
                type: "string",
                id: 7
              },
              googCpuLimitedResolution: {
                type: "string",
                id: 8
              },
              googNacksReceived: {
                type: "string",
                id: 9
              },
              googBandwidthLimitedResolution: {
                type: "string",
                id: 10
              },
              googFrameHeightInput: {
                type: "string",
                id: 11
              },
              googAvgEncodeMs: {
                type: "string",
                id: 12
              },
              googTrackId: {
                type: "string",
                id: 13
              },
              googFrameRateInput: {
                type: "string",
                id: 14
              },
              framesEncoded: {
                type: "string",
                id: 15
              },
              codecImplementationName: {
                type: "string",
                id: 16
              },
              transportId: {
                type: "string",
                id: 17
              },
              mediaType: {
                type: "string",
                id: 18
              },
              googFrameHeightSent: {
                type: "string",
                id: 19
              },
              googFrameRateSent: {
                type: "string",
                id: 20
              },
              googCodecName: {
                type: "string",
                id: 21
              },
              hugeFramesSent: {
                type: "string",
                id: 22
              },
              qpSum: {
                type: "string",
                id: 23
              },
              googPlisReceived: {
                type: "string",
                id: 24
              },
              googAdaptationChanges: {
                type: "string",
                id: 25
              },
              ssrc: {
                type: "string",
                id: 26
              },
              googFirsReceived: {
                type: "string",
                id: 27
              },
              packetsSent: {
                type: "string",
                id: 28
              },
              bytesSent: {
                type: "string",
                id: 29
              },
              id: {
                type: "string",
                id: 30
              },
              type: {
                type: "string",
                id: 31
              },
              timestamp: {
                type: "string",
                id: 32
              },
              localuid: {
                type: "int64",
                id: 33
              },
              remoteuid: {
                type: "int64",
                id: 34
              },
              bitsSentPerSecond: {
                type: "int64",
                id: 35
              },
              packetsSentPerSecond: {
                type: "int64",
                id: 36
              },
              sendPacketLoss: {
                type: "int64",
                id: 37
              }
            }
          },
          media_source_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              trackIdentifier: {
                type: "string",
                id: 4
              },
              kind: {
                type: "string",
                id: 5
              },
              width: {
                type: "int64",
                id: 6
              },
              height: {
                type: "int64",
                id: 7
              },
              framesPerSecond: {
                type: "int64",
                id: 8
              }
            }
          },
          candidate_pair_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              transportId: {
                type: "string",
                id: 4
              },
              localCandidateId: {
                type: "string",
                id: 5
              },
              remoteCandidateId: {
                type: "string",
                id: 6
              },
              state: {
                type: "string",
                id: 7
              },
              priority: {
                type: "int64",
                id: 8
              },
              nominated: {
                type: "bool",
                id: 9
              },
              writable: {
                type: "bool",
                id: 10
              },
              bytesSent: {
                type: "int64",
                id: 11
              },
              bytesReceived: {
                type: "int64",
                id: 12
              },
              totalRoundTripTime: {
                type: "double",
                id: 13
              },
              currentRoundTripTime: {
                type: "double",
                id: 14
              },
              availableOutgoingBitrate: {
                type: "int64",
                id: 15
              },
              requestsReceived: {
                type: "int64",
                id: 16
              },
              requestsSent: {
                type: "int64",
                id: 17
              },
              responsesReceived: {
                type: "int64",
                id: 18
              },
              responsesSent: {
                type: "int64",
                id: 19
              },
              consentRequestsSent: {
                type: "int64",
                id: 20
              }
            }
          },
          local_candidate_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              transportId: {
                type: "string",
                id: 4
              },
              isRemote: {
                type: "bool",
                id: 5
              },
              networkType: {
                type: "string",
                id: 6
              },
              ip: {
                type: "string",
                id: 7
              },
              port: {
                type: "int64",
                id: 8
              },
              protocol: {
                type: "string",
                id: 9
              },
              candidateType: {
                type: "string",
                id: 10
              },
              priority: {
                type: "int64",
                id: 11
              },
              deleted: {
                type: "bool",
                id: 12
              }
            }
          },
          remote_candidate_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              transportId: {
                type: "string",
                id: 4
              },
              isRemote: {
                type: "bool",
                id: 5
              },
              ip: {
                type: "string",
                id: 6
              },
              port: {
                type: "int64",
                id: 7
              },
              protocol: {
                type: "string",
                id: 8
              },
              candidateType: {
                type: "string",
                id: 9
              },
              priority: {
                type: "int64",
                id: 10
              },
              deleted: {
                type: "bool",
                id: 11
              }
            }
          },
          track_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              trackIdentifier: {
                type: "string",
                id: 4
              },
              mediaSourceId: {
                type: "string",
                id: 5
              },
              remoteSource: {
                type: "bool",
                id: 6
              },
              ended: {
                type: "bool",
                id: 7
              },
              detached: {
                type: "bool",
                id: 8
              },
              kind: {
                type: "string",
                id: 9
              },
              frameWidth: {
                type: "int64",
                id: 10
              },
              frameHeight: {
                type: "int64",
                id: 11
              },
              framesSent: {
                type: "int64",
                id: 12
              },
              hugeFramesSent: {
                type: "int64",
                id: 13
              }
            }
          },
          outbound_rtp_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              ssrc: {
                type: "int64",
                id: 4
              },
              isRemote: {
                type: "bool",
                id: 5
              },
              mediaType: {
                type: "string",
                id: 6
              },
              kind: {
                type: "string",
                id: 7
              },
              trackId: {
                type: "string",
                id: 8
              },
              transportId: {
                type: "string",
                id: 9
              },
              codecId: {
                type: "string",
                id: 10
              },
              firCount: {
                type: "int64",
                id: 11
              },
              pliCount: {
                type: "int64",
                id: 12
              },
              nackCount: {
                type: "int64",
                id: 13
              },
              qpSum: {
                type: "int64",
                id: 14
              },
              mediaSourceId: {
                type: "string",
                id: 15
              },
              remoteId: {
                type: "string",
                id: 16
              },
              packetsSent: {
                type: "int64",
                id: 17
              },
              retransmittedPacketsSent: {
                type: "int64",
                id: 18
              },
              bytesSent: {
                type: "int64",
                id: 19
              },
              headerBytesSent: {
                type: "int64",
                id: 20
              },
              retransmittedBytesSent: {
                type: "int64",
                id: 21
              },
              framesEncoded: {
                type: "int64",
                id: 22
              },
              keyFramesEncoded: {
                type: "int64",
                id: 23
              },
              totalEncodeTime: {
                type: "double",
                id: 24
              },
              totalEncodedBytesTarget: {
                type: "int64",
                id: 25
              },
              frameWidth: {
                type: "int64",
                id: 26
              },
              frameHeight: {
                type: "int64",
                id: 27
              },
              framesPerSecond: {
                type: "int64",
                id: 28
              },
              framesSent: {
                type: "int64",
                id: 29
              },
              hugeFramesSent: {
                type: "int64",
                id: 30
              },
              totalPacketSendDelay: {
                type: "double",
                id: 31
              },
              qualityLimitationReason: {
                type: "string",
                id: 32
              },
              qualityLimitationResolutionChanges: {
                type: "int64",
                id: 33
              },
              encoderImplementation: {
                type: "string",
                id: 34
              }
            }
          },
          remote_inbound_rtp_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              ssrc: {
                type: "int64",
                id: 4
              },
              kind: {
                type: "string",
                id: 5
              },
              transportId: {
                type: "string",
                id: 6
              },
              codecId: {
                type: "string",
                id: 7
              },
              packetsLost: {
                type: "int64",
                id: 8
              },
              jitter: {
                type: "double",
                id: 9
              },
              localId: {
                type: "string",
                id: 10
              },
              roundTripTime: {
                type: "double",
                id: 11
              }
            }
          },
          transport_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              bytesSent: {
                type: "int64",
                id: 4
              },
              packetsSent: {
                type: "int64",
                id: 5
              },
              bytesReceived: {
                type: "int64",
                id: 6
              },
              packetsReceived: {
                type: "int64",
                id: 7
              },
              dtlsState: {
                type: "string",
                id: 8
              },
              selectedCandidatePairId: {
                type: "string",
                id: 9
              },
              localCertificateId: {
                type: "string",
                id: 10
              },
              remoteCertificateId: {
                type: "string",
                id: 11
              },
              tlsVersion: {
                type: "string",
                id: 12
              },
              dtlsCipher: {
                type: "string",
                id: 13
              },
              srtpCipher: {
                type: "string",
                id: 14
              },
              selectedCandidatePairChanges: {
                type: "int64",
                id: 15
              }
            }
          },
          audio_track_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              detached: {
                type: "bool",
                id: 4
              },
              ended: {
                type: "bool",
                id: 5
              },
              remoteSource: {
                type: "bool",
                id: 6
              },
              trackIdentifier: {
                type: "string",
                id: 7
              },
              mediaType: {
                type: "string",
                id: 8
              }
            }
          },
          video_track_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              detached: {
                type: "bool",
                id: 4
              },
              ended: {
                type: "bool",
                id: 5
              },
              frameHeight: {
                type: "int64",
                id: 6
              },
              frameWidth: {
                type: "int64",
                id: 7
              },
              framesSent: {
                type: "int64",
                id: 8
              },
              remoteSource: {
                type: "bool",
                id: 9
              },
              trackIdentifier: {
                type: "string",
                id: 10
              },
              ssrc: {
                type: "int64",
                id: 11
              },
              frameRateSent: {
                type: "int64",
                id: 12
              },
              mediaType: {
                type: "string",
                id: 13
              }
            }
          },
          audio_outbound_rtp_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              codecId: {
                type: "string",
                id: 4
              },
              kind: {
                type: "string",
                id: 5
              },
              mediaType: {
                type: "string",
                id: 6
              },
              ssrc: {
                type: "int64",
                id: 7
              },
              transportId: {
                type: "string",
                id: 8
              },
              bytesSent: {
                type: "int64",
                id: 9
              },
              packetsSent: {
                type: "int64",
                id: 10
              },
              headerBytesSent: {
                type: "int64",
                id: 11
              },
              mediaSourceId: {
                type: "string",
                id: 12
              },
              remoteId: {
                type: "string",
                id: 13
              },
              retransmittedBytesSent: {
                type: "int64",
                id: 14
              },
              retransmittedPacketsSent: {
                type: "int64",
                id: 15
              },
              trackId: {
                type: "string",
                id: 16
              },
              bitsSentPerSecond: {
                type: "int64",
                id: 17
              },
              packetsSentPerSecond: {
                type: "int64",
                id: 18
              }
            }
          },
          video_outbound_rtp_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              codecId: {
                type: "string",
                id: 4
              },
              kind: {
                type: "string",
                id: 5
              },
              mediaType: {
                type: "string",
                id: 6
              },
              ssrc: {
                type: "int64",
                id: 7
              },
              transportId: {
                type: "string",
                id: 8
              },
              bytesSent: {
                type: "int64",
                id: 9
              },
              packetsSent: {
                type: "int64",
                id: 10
              },
              firCount: {
                type: "int64",
                id: 11
              },
              frameHeight: {
                type: "int64",
                id: 12
              },
              frameWidth: {
                type: "int64",
                id: 13
              },
              framesEncoded: {
                type: "int64",
                id: 14
              },
              framesPerSecond: {
                type: "int64",
                id: 15
              },
              framesSent: {
                type: "int64",
                id: 16
              },
              headerBytesSent: {
                type: "int64",
                id: 17
              },
              hugeFramesSent: {
                type: "int64",
                id: 18
              },
              keyFramesEncoded: {
                type: "int64",
                id: 19
              },
              mediaSourceId: {
                type: "string",
                id: 20
              },
              nackCount: {
                type: "int64",
                id: 21
              },
              pliCount: {
                type: "int64",
                id: 22
              },
              qpSum: {
                type: "int64",
                id: 23
              },
              qualityLimitationResolutionChanges: {
                type: "int64",
                id: 24
              },
              remoteId: {
                type: "string",
                id: 25
              },
              retransmittedBytesSent: {
                type: "int64",
                id: 26
              },
              retransmittedPacketsSent: {
                type: "int64",
                id: 27
              },
              totalEncodeTime: {
                type: "double",
                id: 28
              },
              totalEncodedBytesTarget: {
                type: "int64",
                id: 29
              },
              totalPacketSendDelay: {
                type: "double",
                id: 30
              },
              trackId: {
                type: "string",
                id: 31
              },
              bitsSentPerSecond: {
                type: "int64",
                id: 32
              },
              packetsSentPerSecond: {
                type: "int64",
                id: 33
              },
              frameRateSent: {
                type: "int64",
                id: 34
              }
            }
          }
        }
      },
      remote_obj: {
        fields: {
          video_ssrc: {
            rule: "repeated",
            type: "video_ssrc_obj",
            id: 1
          },
          audio_ssrc: {
            rule: "repeated",
            type: "audio_ssrc_obj",
            id: 2
          },
          candidate_pair: {
            rule: "repeated",
            type: "candidate_pair_obj",
            id: 3
          },
          remote_candidate: {
            rule: "repeated",
            type: "remote_candidate_obj",
            id: 4
          },
          local_candidate: {
            rule: "repeated",
            type: "local_candidate_obj",
            id: 5
          },
          inbound_rtp: {
            rule: "repeated",
            type: "inbound_rtp_obj",
            id: 6
          },
          track: {
            rule: "repeated",
            type: "track_obj",
            id: 7
          },
          transport: {
            rule: "repeated",
            type: "transport_obj",
            id: 8
          },
          audio_inbound_rtp: {
            rule: "repeated",
            type: "audio_inbound_rtp_obj",
            id: 9
          },
          video_inbound_rtp: {
            rule: "repeated",
            type: "video_inbound_rtp_obj",
            id: 10
          },
          audio_track: {
            rule: "repeated",
            type: "audio_track_obj",
            id: 11
          },
          video_track: {
            rule: "repeated",
            type: "video_track_obj",
            id: 12
          }
        },
        nested: {
          video_ssrc_obj: {
            fields: {
              googContentType: {
                type: "string",
                id: 1
              },
              googCaptureStartNtpTimeMs: {
                type: "string",
                id: 2
              },
              googTargetDelayMs: {
                type: "string",
                id: 3
              },
              packetsLost: {
                type: "string",
                id: 4
              },
              googDecodeMs: {
                type: "string",
                id: 5
              },
              googFrameHeightReceived: {
                type: "string",
                id: 6
              },
              googFrameRateOutput: {
                type: "string",
                id: 7
              },
              packetsReceived: {
                type: "string",
                id: 8
              },
              ssrc: {
                type: "string",
                id: 9
              },
              googRenderDelayMs: {
                type: "string",
                id: 10
              },
              googMaxDecodeMs: {
                type: "string",
                id: 11
              },
              googTrackId: {
                type: "string",
                id: 12
              },
              googFrameWidthReceived: {
                type: "string",
                id: 13
              },
              codecImplementationName: {
                type: "string",
                id: 14
              },
              transportId: {
                type: "string",
                id: 15
              },
              mediaType: {
                type: "string",
                id: 16
              },
              googInterframeDelayMax: {
                type: "string",
                id: 17
              },
              googCodecName: {
                type: "string",
                id: 18
              },
              googFrameRateReceived: {
                type: "string",
                id: 19
              },
              framesDecoded: {
                type: "string",
                id: 20
              },
              googNacksSent: {
                type: "string",
                id: 21
              },
              googFirsSent: {
                type: "string",
                id: 22
              },
              bytesReceived: {
                type: "string",
                id: 23
              },
              googFirstFrameReceivedToDecodedMs: {
                type: "string",
                id: 24
              },
              googCurrentDelayMs: {
                type: "string",
                id: 25
              },
              googMinPlayoutDelayMs: {
                type: "string",
                id: 26
              },
              googFrameRateDecoded: {
                type: "string",
                id: 27
              },
              googJitterBufferMs: {
                type: "string",
                id: 28
              },
              googPlisSent: {
                type: "string",
                id: 29
              },
              id: {
                type: "string",
                id: 30
              },
              type: {
                type: "string",
                id: 31
              },
              timestamp: {
                type: "string",
                id: 32
              },
              localuid: {
                type: "int64",
                id: 33
              },
              remoteuid: {
                type: "string",
                id: 34
              },
              bitsReceivedPerSecond: {
                type: "int64",
                id: 35
              },
              packetsReceivedPerSecond: {
                type: "int64",
                id: 36
              },
              recvPacketLoss: {
                type: "int64",
                id: 37
              }
            }
          },
          audio_ssrc_obj: {
            fields: {
              googDecodingCTN: {
                type: "string",
                id: 1
              },
              packetsLost: {
                type: "string",
                id: 2
              },
              googSecondaryDecodedRate: {
                type: "string",
                id: 3
              },
              googDecodingPLC: {
                type: "string",
                id: 4
              },
              packetsReceived: {
                type: "string",
                id: 5
              },
              googJitterReceived: {
                type: "string",
                id: 6
              },
              googDecodingCNG: {
                type: "string",
                id: 7
              },
              ssrc: {
                type: "string",
                id: 8
              },
              googPreferredJitterBufferMs: {
                type: "string",
                id: 9
              },
              googSpeechExpandRate: {
                type: "string",
                id: 10
              },
              totalSamplesDuration: {
                type: "string",
                id: 11
              },
              totalAudioEnergy: {
                type: "string",
                id: 12
              },
              transportId: {
                type: "string",
                id: 13
              },
              mediaType: {
                type: "string",
                id: 14
              },
              googDecodingPLCCNG: {
                type: "string",
                id: 15
              },
              googCodecName: {
                type: "string",
                id: 16
              },
              googSecondaryDiscardedRate: {
                type: "string",
                id: 17
              },
              googDecodingNormal: {
                type: "string",
                id: 18
              },
              googTrackId: {
                type: "string",
                id: 19
              },
              audioOutputLevel: {
                type: "string",
                id: 20
              },
              googAccelerateRate: {
                type: "string",
                id: 21
              },
              bytesReceived: {
                type: "string",
                id: 22
              },
              googCurrentDelayMs: {
                type: "string",
                id: 23
              },
              googDecodingCTSG: {
                type: "string",
                id: 24
              },
              googExpandRate: {
                type: "string",
                id: 25
              },
              googPreemptiveExpandRate: {
                type: "string",
                id: 26
              },
              googJitterBufferMs: {
                type: "string",
                id: 27
              },
              googDecodingMuted: {
                type: "string",
                id: 28
              },
              id: {
                type: "string",
                id: 29
              },
              type: {
                type: "string",
                id: 30
              },
              timestamp: {
                type: "string",
                id: 31
              },
              localuid: {
                type: "int64",
                id: 32
              },
              remoteuid: {
                type: "string",
                id: 33
              },
              bitsReceivedPerSecond: {
                type: "int64",
                id: 34
              },
              packetsReceivedPerSecond: {
                type: "int64",
                id: 35
              },
              recvPacketLoss: {
                type: "int64",
                id: 36
              }
            }
          },
          candidate_pair_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              transportId: {
                type: "string",
                id: 4
              },
              localCandidateId: {
                type: "string",
                id: 5
              },
              remoteCandidateId: {
                type: "string",
                id: 6
              },
              state: {
                type: "string",
                id: 7
              },
              priority: {
                type: "int64",
                id: 8
              },
              nominated: {
                type: "bool",
                id: 9
              },
              writable: {
                type: "bool",
                id: 10
              },
              bytesSent: {
                type: "int64",
                id: 11
              },
              bytesReceived: {
                type: "int64",
                id: 12
              },
              totalRoundTripTime: {
                type: "double",
                id: 13
              },
              currentRoundTripTime: {
                type: "double",
                id: 14
              },
              availableOutgoingBitrate: {
                type: "int64",
                id: 15
              },
              requestsReceived: {
                type: "int64",
                id: 16
              },
              requestsSent: {
                type: "int64",
                id: 17
              },
              responsesReceived: {
                type: "int64",
                id: 18
              },
              responsesSent: {
                type: "int64",
                id: 19
              },
              consentRequestsSent: {
                type: "int64",
                id: 20
              }
            }
          },
          remote_candidate_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              transportId: {
                type: "string",
                id: 4
              },
              isRemote: {
                type: "bool",
                id: 5
              },
              ip: {
                type: "string",
                id: 6
              },
              port: {
                type: "int64",
                id: 7
              },
              protocol: {
                type: "string",
                id: 8
              },
              candidateType: {
                type: "string",
                id: 9
              },
              priority: {
                type: "int64",
                id: 10
              },
              deleted: {
                type: "bool",
                id: 11
              }
            }
          },
          local_candidate_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              transportId: {
                type: "string",
                id: 4
              },
              isRemote: {
                type: "bool",
                id: 5
              },
              networkType: {
                type: "string",
                id: 6
              },
              ip: {
                type: "string",
                id: 7
              },
              port: {
                type: "int64",
                id: 8
              },
              protocol: {
                type: "string",
                id: 9
              },
              candidateType: {
                type: "string",
                id: 10
              },
              priority: {
                type: "int64",
                id: 11
              },
              deleted: {
                type: "bool",
                id: 12
              }
            }
          },
          inbound_rtp_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              ssrc: {
                type: "int64",
                id: 4
              },
              isRemote: {
                type: "bool",
                id: 5
              },
              mediaType: {
                type: "string",
                id: 6
              },
              kind: {
                type: "string",
                id: 7
              },
              trackId: {
                type: "string",
                id: 8
              },
              transportId: {
                type: "string",
                id: 9
              },
              codecId: {
                type: "string",
                id: 10
              },
              packetsReceived: {
                type: "int64",
                id: 11
              },
              fecPacketsReceived: {
                type: "int64",
                id: 12
              },
              fecPacketsDiscarded: {
                type: "int64",
                id: 13
              },
              bytesReceived: {
                type: "int64",
                id: 14
              },
              headerBytesReceived: {
                type: "int64",
                id: 15
              },
              packetsLost: {
                type: "int64",
                id: 16
              },
              lastPacketReceivedTimestamp: {
                type: "double",
                id: 17
              },
              jitter: {
                type: "double",
                id: 18
              },
              jitterBufferDelay: {
                type: "double",
                id: 19
              },
              jitterBufferEmittedCount: {
                type: "int64",
                id: 20
              },
              totalSamplesReceived: {
                type: "int64",
                id: 21
              },
              concealedSamples: {
                type: "int64",
                id: 22
              },
              silentConcealedSamples: {
                type: "int64",
                id: 23
              },
              concealmentEvents: {
                type: "int64",
                id: 24
              },
              insertedSamplesForDeceleration: {
                type: "int64",
                id: 25
              },
              removedSamplesForAcceleration: {
                type: "int64",
                id: 26
              },
              audioLevel: {
                type: "double",
                id: 27
              },
              totalAudioEnergy: {
                type: "double",
                id: 28
              },
              totalSamplesDuration: {
                type: "double",
                id: 29
              },
              estimatedPlayoutTimestamp: {
                type: "int64",
                id: 30
              }
            }
          },
          track_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              trackIdentifier: {
                type: "string",
                id: 4
              },
              remoteSource: {
                type: "bool",
                id: 5
              },
              ended: {
                type: "bool",
                id: 6
              },
              detached: {
                type: "bool",
                id: 7
              },
              kind: {
                type: "string",
                id: 8
              },
              jitterBufferDelay: {
                type: "double",
                id: 9
              },
              jitterBufferEmittedCount: {
                type: "int64",
                id: 10
              },
              audioLevel: {
                type: "double",
                id: 11
              },
              totalAudioEnergy: {
                type: "double",
                id: 12
              },
              totalSamplesReceived: {
                type: "int64",
                id: 13
              },
              totalSamplesDuration: {
                type: "double",
                id: 14
              },
              concealedSamples: {
                type: "int64",
                id: 15
              },
              silentConcealedSamples: {
                type: "int64",
                id: 16
              },
              concealmentEvents: {
                type: "int64",
                id: 17
              },
              insertedSamplesForDeceleration: {
                type: "int64",
                id: 18
              },
              removedSamplesForAcceleration: {
                type: "int64",
                id: 19
              }
            }
          },
          transport_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "double",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              bytesSent: {
                type: "int64",
                id: 4
              },
              packetsSent: {
                type: "int64",
                id: 5
              },
              bytesReceived: {
                type: "int64",
                id: 6
              },
              packetsReceived: {
                type: "int64",
                id: 7
              },
              dtlsState: {
                type: "string",
                id: 8
              },
              selectedCandidatePairId: {
                type: "string",
                id: 9
              },
              localCertificateId: {
                type: "string",
                id: 10
              },
              remoteCertificateId: {
                type: "string",
                id: 11
              },
              tlsVersion: {
                type: "string",
                id: 12
              },
              dtlsCipher: {
                type: "string",
                id: 13
              },
              srtpCipher: {
                type: "string",
                id: 14
              },
              selectedCandidatePairChanges: {
                type: "int64",
                id: 15
              }
            }
          },
          audio_inbound_rtp_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              codecId: {
                type: "string",
                id: 4
              },
              kind: {
                type: "string",
                id: 5
              },
              mediaType: {
                type: "string",
                id: 6
              },
              ssrc: {
                type: "int64",
                id: 7
              },
              transportId: {
                type: "string",
                id: 8
              },
              jitter: {
                type: "double",
                id: 9
              },
              packetsLost: {
                type: "int64",
                id: 10
              },
              packetsReceived: {
                type: "int64",
                id: 11
              },
              audioLevel: {
                type: "int64",
                id: 12
              },
              bytesReceived: {
                type: "int64",
                id: 13
              },
              concealedSamples: {
                type: "int64",
                id: 14
              },
              concealmentEvents: {
                type: "int64",
                id: 15
              },
              estimatedPlayoutTimestamp: {
                type: "int64",
                id: 16
              },
              fecPacketsDiscarded: {
                type: "int64",
                id: 17
              },
              fecPacketsReceived: {
                type: "int64",
                id: 18
              },
              headerBytesReceived: {
                type: "int64",
                id: 19
              },
              insertedSamplesForDeceleration: {
                type: "int64",
                id: 20
              },
              jitterBufferDelay: {
                type: "double",
                id: 21
              },
              jitterBufferEmittedCount: {
                type: "int64",
                id: 22
              },
              lastPacketReceivedTimestamp: {
                type: "double",
                id: 23
              },
              removedSamplesForAcceleration: {
                type: "int64",
                id: 24
              },
              silentConcealedSamples: {
                type: "int64",
                id: 25
              },
              totalAudioEnergy: {
                type: "double",
                id: 26
              },
              totalSamplesDuration: {
                type: "double",
                id: 27
              },
              totalSamplesReceived: {
                type: "int64",
                id: 28
              },
              trackId: {
                type: "string",
                id: 29
              },
              bitsReceivedPerSecond: {
                type: "int64",
                id: 30
              },
              packetsReceivedPerSecond: {
                type: "int64",
                id: 31
              }
            }
          },
          video_inbound_rtp_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              codecId: {
                type: "string",
                id: 4
              },
              kind: {
                type: "string",
                id: 5
              },
              mediaType: {
                type: "string",
                id: 6
              },
              ssrc: {
                type: "int64",
                id: 7
              },
              transportId: {
                type: "string",
                id: 8
              },
              packetsLost: {
                type: "int64",
                id: 9
              },
              packetsReceived: {
                type: "int64",
                id: 10
              },
              bytesReceived: {
                type: "int64",
                id: 11
              },
              estimatedPlayoutTimestamp: {
                type: "int64",
                id: 12
              },
              firCount: {
                type: "int64",
                id: 13
              },
              frameHeight: {
                type: "int64",
                id: 14
              },
              frameWidth: {
                type: "int64",
                id: 15
              },
              framesDecoded: {
                type: "int64",
                id: 16
              },
              framesPerSecond: {
                type: "int64",
                id: 17
              },
              framesReceived: {
                type: "int64",
                id: 18
              },
              headerBytesReceived: {
                type: "int64",
                id: 19
              },
              keyFramesDecoded: {
                type: "int64",
                id: 20
              },
              lastPacketReceivedTimestamp: {
                type: "int64",
                id: 21
              },
              nackCount: {
                type: "int64",
                id: 22
              },
              pliCount: {
                type: "int64",
                id: 23
              },
              totalDecodeTime: {
                type: "double",
                id: 24
              },
              totalInterFrameDelay: {
                type: "double",
                id: 25
              },
              totalSquaredInterFrameDelay: {
                type: "double",
                id: 26
              },
              trackId: {
                type: "string",
                id: 27
              },
              bitsReceivedPerSecond: {
                type: "int64",
                id: 28
              },
              packetsReceivedPerSecond: {
                type: "int64",
                id: 29
              }
            }
          },
          audio_track_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              audioLevel: {
                type: "double",
                id: 4
              },
              detached: {
                type: "bool",
                id: 5
              },
              ended: {
                type: "bool",
                id: 6
              },
              jitterBufferFlushes: {
                type: "int64",
                id: 7
              },
              remoteSource: {
                type: "bool",
                id: 8
              },
              trackIdentifier: {
                type: "string",
                id: 9
              },
              mediaType: {
                type: "string",
                id: 10
              }
            }
          },
          video_track_obj: {
            fields: {
              id: {
                type: "string",
                id: 1
              },
              timestamp: {
                type: "int64",
                id: 2
              },
              type: {
                type: "string",
                id: 3
              },
              detached: {
                type: "bool",
                id: 4
              },
              ended: {
                type: "bool",
                id: 5
              },
              frameHeight: {
                type: "int64",
                id: 6
              },
              frameWidth: {
                type: "int64",
                id: 7
              },
              framesDecoded: {
                type: "int64",
                id: 8
              },
              framesDropped: {
                type: "int64",
                id: 9
              },
              framesReceived: {
                type: "int64",
                id: 10
              },
              freezeCount: {
                type: "int64",
                id: 11
              },
              pauseCount: {
                type: "int64",
                id: 12
              },
              remoteSource: {
                type: "bool",
                id: 13
              },
              sumOfSquaredFramesDuration: {
                type: "double",
                id: 14
              },
              totalFramesDuration: {
                type: "double",
                id: 15
              },
              totalFreezesDuration: {
                type: "double",
                id: 16
              },
              totalPausesDuration: {
                type: "int64",
                id: 17
              },
              trackIdentifier: {
                type: "string",
                id: 18
              },
              ssrc: {
                type: "int64",
                id: 19
              },
              mediaType: {
                type: "string",
                id: 20
              }
            }
          }
        }
      }
    }
  }
});

module.exports = $root;

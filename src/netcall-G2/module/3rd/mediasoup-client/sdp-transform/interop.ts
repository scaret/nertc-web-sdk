import clonedeep from 'lodash.clonedeep'

import transform from './transform'

const PLAN_B_MIDS = ['audio', 'video', 'data']
const findSimGroup = (ssrcGroup: any) => ssrcGroup.find((grp: any) => grp.semantics === 'SIM')
const findFidGroup = (ssrcGroup: any) => ssrcGroup.find((grp: any) => grp.semantics === 'FID')

/**
 * Add the ssrcs of the SIM group and their corresponding FID group ssrcs
 * to the m-line.
 * @param {Object} mLine - The m-line to which ssrcs have to be added.
 * @param {Object} simGroup - The SIM group whose ssrcs have to be added to
 * the m-line.
 * @param {Object} sourceGroups - inverted source-group map.
 * @param {Array<Object>} sourceList - array containing all the sources.
 */
function addSimGroupSources(mLine: any, simGroup: any, sourceGroups: any, sourceList: any) {
  if (!mLine || !simGroup) {
    return
  }
  const findSourcebyId = (src: any) =>
    sourceList.find((source: any) => source.id.toString() === src)

  simGroup.ssrcs.forEach((src: any) => {
    mLine.sources.push(findSourcebyId(src))

    // find the related FID group member for this ssrc.
    const relatedFidGroup = sourceGroups[parseInt(src, 10)].find(
      (grp: any) => grp.semantics === 'FID'
    )

    if (relatedFidGroup) {
      const relatedSsrc = relatedFidGroup.ssrcs.find((s: any) => s !== src)

      mLine.sources.push(findSourcebyId(relatedSsrc))
      mLine.ssrcGroups.push(relatedFidGroup)
    }
  })

  // Add the SIM group last.
  mLine.ssrcGroups.push(simGroup)
}

/**
 * Add ssrcs and ssrc-groups to the m-line. When a primary ssrc, i.e., the
 * first ssrc in a SIM group is passed, all the other ssrcs from the SIM
 * group and the other ssrcs from the related FID groups are added to the same
 * m-line since they all belong to the same remote source. Since the ssrcs are
 * not guaranteed to be in the correct order, try to find if a SIM group exists,
 * if not, just add the FID group.
 * @param {Object} mLine - The m-line to which ssrcs have to be added.
 * @param {Object} ssrc - the primary ssrc.
 * @param {Object} sourceGroups - inverted source-group map.
 * @param {Array<Object>} sourceList - array containing all the sources.
 * @returns {void}
 */
function addSourcesToMline(mLine: any, ssrc: any, sourceGroups: any, sourceList: any) {
  if (!mLine || !ssrc) {
    return
  }
  mLine.sources = []
  mLine.ssrcGroups = []

  // If there are no associated ssrc-groups, just add the ssrc and msid.
  if (!sourceGroups[ssrc.id]) {
    mLine.sources.push(ssrc)
    mLine.msid = ssrc.msid

    return
  }
  const findSourcebyId = (src: any) =>
    sourceList.find((source: any) => source.id.toString() === src)

  // Find the SIM and FID groups that this ssrc belongs to.
  const simGroup = findSimGroup(sourceGroups[ssrc.id])
  const fidGroup = findFidGroup(sourceGroups[ssrc.id])

  // Add the ssrcs for the SIM group and their corresponding FID groups.
  if (simGroup) {
    addSimGroupSources(mLine, simGroup, sourceGroups, sourceList)
  } else if (fidGroup) {
    // check if the other ssrc from this FID group is part of a SIM group
    const otherSsrc = fidGroup.ssrcs.find((s: any) => s !== ssrc)
    const simGroup2 = findSimGroup(sourceGroups[otherSsrc])

    if (simGroup2) {
      addSimGroupSources(mLine, simGroup2, sourceGroups, sourceList)
    } else {
      // Add the FID group ssrcs.
      fidGroup.ssrcs.forEach((src: any) => {
        mLine.sources.push(findSourcebyId(src))
      })
      mLine.ssrcGroups.push(fidGroup)
    }
  }

  // Set the msid for the media description using the msid attribute of the ssrcs.
  mLine.msid = mLine.sources[0].msid
}

/**
 * Checks if there is a mline for the given ssrc or its related primary ssrc.
 * We always implode the SIM group to the first ssrc in the SIM group before sRD,
 * so we also check if mline for that ssrc exists.
 * For example:
 * If the following ssrcs are in a SIM group,
 * <ssrc-group xmlns=\"urn:xmpp:jingle:apps:rtp:ssma:0\" semantics=\"SIM\">
 *        <source ssrc=\"1806330949\"/>
 *        <source ssrc=\"4173145196\"/>
 *        <source ssrc=\"2002632207\"/>
 * </ssrc-group>
 * This method returns true for any one of the 3 ssrcs if there is a mline for 1806330949.
 * @param {Object} ssrc - ssrc to check.
 * @param {Object} sourceGroups - inverted source-group map.
 * @param {Array<Object>} mlines - mlines in the description

 * @returns {Boolean} - Returns true if mline for the given ssrc or the related primary ssrc
 * exists, returns false otherwise.
 */
function checkIfMlineForSsrcExists(ssrc: any, sourceGroups: any, mlines: any): any {
  const findMatchingMline = (mline: any) => {
    if (mline.sources) {
      return mline.sources.some((source: any) => source.id === ssrc.id)
    }

    return false
  }

  if (!mlines.find(findMatchingMline)) {
    // check if this ssrc is member of a SIM group. If so, check if there
    // is a matching m-line for the primary ssrc of the SIM group.
    if (!sourceGroups[ssrc.id]) {
      return false
    }
    const simGroup = findSimGroup(sourceGroups[ssrc.id])
    const fidGroup = findFidGroup(sourceGroups[ssrc.id])

    if (simGroup) {
      return mlines.some(
        (mline: any) =>
          mline.sources && mline.sources.some((src: any) => src.id.toString() === simGroup.ssrcs[0])
      )
    } else if (fidGroup && ssrc.id.toString() !== fidGroup.ssrcs[0]) {
      const otherSsrc = { id: fidGroup.ssrcs[0] }

      return checkIfMlineForSsrcExists(otherSsrc, sourceGroups, mlines)
    }

    return false
  }

  return true
}

/**
 * Create an inverted sourceGroup map to put all the grouped ssrcs
 * in the same m-line.
 * @param {Array<Object>} sourceGroups
 * @returns {Object} - An inverted sourceGroup map.
 */
function createSourceGroupMap(sourceGroups: any) {
  const ssrc2group = {}

  if (!sourceGroups || !Array.isArray(sourceGroups)) {
    return ssrc2group
  }
  sourceGroups.forEach((group) => {
    if (group.ssrcs && Array.isArray(group.ssrcs)) {
      group.ssrcs.forEach((ssrc: any) => {
        //@ts-ignore
        if (typeof ssrc2group[ssrc] === 'undefined') {
          //@ts-ignore
          ssrc2group[ssrc] = []
        }
        //@ts-ignore
        ssrc2group[ssrc].push(group)
      })
    }
  })

  return ssrc2group
}

/**
 * Check if a new SDP requests an ICE restart.
 * @param {Object} - the parsed new SDP
 * @param {Object} - the parsed previous SDP
 * @returns {Boolean} - Returns true if an ICE restart is requested otherwise false.
 */
function checkForIceRestart(newDesc: any, oldDesc: any) {
  if (!newDesc || !oldDesc || newDesc.media.length === 0 || oldDesc.media.length === 0) {
    return false
  }

  const newMLine = newDesc.media[0]
  const oldMLine = oldDesc.media[0]

  return newMLine.iceUfrag !== oldMLine.iceUfrag || newMLine.icePwd !== oldMLine.icePwd
}

/**
 * Interop provides an API for tranforming a Plan B SDP to a Unified Plan SDP and
 * vice versa.
 */
export class Interop {
  /**
   * This method transforms a Unified Plan SDP to an equivalent Plan B SDP.
   * @param {RTCSessionDescription} description - The description in Unified plan format.
   * @returns RTCSessionDescription - The transformed session description.
   */
  toPlanB(description: any) {
    if (!description || typeof description.sdp !== 'string') {
      console.warn('An empty description was passed as an argument.')

      return description
    }

    // Objectify the SDP for easier manipulation.
    const session = transform.parse(description.sdp)

    // If the SDP contains no media, there's nothing to transform.
    if (!session.media || !session.media.length) {
      console.warn('The description has no media.')

      return description
    }

    // Make sure this is a unified plan sdp
    if (session.media.every((m: any) => PLAN_B_MIDS.indexOf(m.mid) !== -1)) {
      console.warn('The description does not look like unified plan sdp')

      return description
    }

    const media: any = {}
    const sessionMedia = session.media

    session.media = []
    sessionMedia.forEach((mLine) => {
      const type = mLine.type

      if (type === 'application') {
        mLine.mid = 'data'
        media[mLine.mid] = mLine

        return
      }
      if (typeof media[type] === 'undefined') {
        const bLine: any = clonedeep(mLine)

        // Copy the msid attribute to all the ssrcs if they belong to the same source group
        if (bLine.sources && Array.isArray(bLine.sources)) {
          bLine.sources.forEach((source: any) => {
            mLine.msid ? (source.msid = mLine.msid) : delete source.msid
          })
        }

        // Do not signal the FID groups if there is no msid attribute present
        // on the sources as sesison-accept with this source info will fail strophe
        // validation and the session will not be established. This behavior is seen
        // on Firefox (with RTX enabled) when no video source is added at the join time.
        // FF generates two recvonly ssrcs with no msid and a corresponding FID group in
        // this case.
        if (!bLine.ssrcGroups || !mLine.msid) {
          bLine.ssrcGroups = []
        }
        delete bLine.msid
        bLine.mid = type
        media[type] = bLine
      } else if (mLine.msid) {
        // Add sources and source-groups to the existing m-line of the same media type.
        const bLine: any = clonedeep(mLine)

        if (bLine.sources && Array.isArray(bLine.sources)) {
          // Copy the msid attribute to each ssrc.
          bLine.sources.forEach((ssrc: any) => {
            ssrc.msid = mLine.msid
          })
          media[type].sources = (media[type].sources || []).concat(bLine.sources)
        }
        if (typeof bLine.ssrcGroups !== 'undefined' && Array.isArray(bLine.ssrcGroups)) {
          media[type].ssrcGroups = (media[type].ssrcGroups || []).concat(bLine.ssrcGroups)
        }
      }
    })
    session.media = Object.values(media)

    // Bundle the media only if it is active.
    const bundle: any = []

    Object.values(media).forEach((mline: any) => {
      if (mline.direction !== 'inactive') {
        bundle.push(mline.mid)
      }
    })

    // We regenerate the BUNDLE group with the new mids.
    //@ts-ignore
    session.groups.forEach((group) => {
      if (group.type === 'BUNDLE') {
        group.mids = bundle.join(' ')
      }
    })

    // msid semantic
    session.msidSemantic = {
      semantic: 'WMS',
      token: '*'
    }
    //@ts-ignore
    const resStr = transform.write(session)

    return new RTCSessionDescription({
      type: description.type,
      sdp: resStr
    })
  }

  /**
   * This method transforms a Plan B SDP to an equivalent Unified Plan SDP.
   * @param {RTCSessionDescription} description - The description in plan-b format.
   * @param {RTCSessionDescription} current - The current description set on
   * the peerconnection in Unified-plan format, i.e., the readonly attribute
   * remoteDescription on the RTCPeerConnection object.
   * @returns RTCSessionDescription - The transformed session description.
   */
  toUnifiedPlan(description: any, current = null) {
    if (!description || typeof description.sdp !== 'string') {
      console.warn('An empty description was passed as an argument.')

      return description
    }

    // Objectify the SDP for easier manipulation.
    const session = transform.parse(description.sdp)

    // If the SDP contains no media, there's nothing to transform.
    if (!session.media || !session.media.length) {
      console.warn('The description has no media.')

      return description
    }

    // Make sure this is a plan-b sdp.
    if (
      session.media.length > 3 ||
      session.media.every((m: any) => PLAN_B_MIDS.indexOf(m.mid) === -1)
    ) {
      console.warn('The description does not look like plan-b')

      return description
    }
    //@ts-ignore
    const currentDesc: any = current ? transform.parse(current.sdp) : null
    const iceRestart = checkForIceRestart(session, currentDesc)
    const newIceUfrag = session.media[0].iceUfrag
    const newIcePwd = session.media[0].icePwd
    const newFingerprint = session.media[0].fingerprint
    const media: any = {}

    session.media.forEach((mLine: any) => {
      const type = mLine.type

      if (type === 'application') {
        if (!currentDesc || !currentDesc.media) {
          const newMline = clonedeep(mLine)

          newMline.mid = Object.keys(media).length.toString()
          media[mLine.mid] = newMline

          return
        }
        const mLineForData = currentDesc.media.findIndex((m: any) => m.type === type)

        if (mLineForData) {
          currentDesc.media[mLineForData] = mLine
          currentDesc.media[mLineForData].mid = mLineForData
        }

        return
      }

      // Create an inverted sourceGroup map here to put all the grouped SSRCs in the same m-line.
      const ssrc2group = createSourceGroupMap(mLine.ssrcGroups)

      // If there are no sources advertised for a media type, add the description if this is the first
      // remote offer, i.e., no current description was passed. Chrome in Unified plan does not produce
      // recvonly ssrcs unlike Firefox and Safari.
      if (!mLine.sources) {
        if (!currentDesc) {
          const newMline = clonedeep(mLine)

          newMline.mid = Object.keys(media).length.toString()
          media[mLine.mid] = newMline
        }

        return
      }
      mLine.sources.forEach((ssrc: any, idx: any) => {
        // Do not add the receive-only ssrcs that Jicofo sends in the source-add.
        // These ssrcs do not have the "msid" attribute set.
        if (!ssrc.msid) {
          return
        }

        // If there is no description set on the peerconnection, create new m-lines.
        if (!currentDesc || !currentDesc.media) {
          if (checkIfMlineForSsrcExists(ssrc, ssrc2group, Object.values(media))) {
            return
          }
          const newMline = clonedeep(mLine)

          newMline.mid = Object.keys(media).length.toString()
          newMline.direction = idx
            ? 'sendonly'
            : mLine.direction === 'sendonly'
            ? 'sendonly'
            : 'sendrecv'
          newMline.bundleOnly = undefined
          addSourcesToMline(newMline, ssrc, ssrc2group, mLine.sources)
          media[newMline.mid] = newMline

          return
        }

        // Create and append the m-lines to the existing description.
        if (checkIfMlineForSsrcExists(ssrc, ssrc2group, currentDesc.media)) {
          return
        }
        const newMline = clonedeep(mLine)

        newMline.mid = currentDesc.media.length.toString()
        newMline.direction = 'sendonly'
        addSourcesToMline(newMline, ssrc, ssrc2group, mLine.sources)
        currentDesc.media.push(newMline)
      })
    })
    session.media = currentDesc ? currentDesc.media : Object.values(media)
    const mids: any = []

    session.media.forEach((mLine) => {
      mids.push(mLine.mid)
      if (iceRestart) {
        mLine.iceUfrag = newIceUfrag
        mLine.icePwd = newIcePwd
      }
      mLine.fingerprint = newFingerprint
    })

    // We regenerate the BUNDLE group (since we regenerated the mids)
    //@ts-ignore
    session.groups.forEach((group) => {
      if (group.type === 'BUNDLE') {
        group.mids = mids.join(' ')
      }
    })

    // msid semantic
    session.msidSemantic = {
      semantic: 'WMS',
      token: '*'
    }

    // Increment the session version every time.
    //@ts-ignore
    session.origin.sessionVersion++
    //@ts-ignore
    const resultSdp = transform.write(session)

    return new RTCSessionDescription({
      type: description.type,
      sdp: resultSdp
    })
  }
}

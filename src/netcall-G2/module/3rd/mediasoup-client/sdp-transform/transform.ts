import transform from 'sdp-transform'

/**
 * Rewrites the source information in the way sdp-transform expects.
 * Source information is split into multiple ssrc objects each containing
 * an id, attribute and value.
 * @param {Object} media - media description to be modified.
 * @returns {void}
 */
const write = function (session: any, opts: any) {
  if (
    typeof session !== 'undefined' &&
    typeof session.media !== 'undefined' &&
    Array.isArray(session.media)
  ) {
    session.media.forEach((mLine: any) => {
      if (mLine.sources && mLine.sources.length) {
        mLine.ssrcs = []
        mLine.sources.forEach((source: any) => {
          Object.keys(source).forEach((attribute) => {
            if (attribute === 'id') {
              return
            }
            mLine.ssrcs.push({
              id: source.id,
              attribute,
              value: source[attribute]
            })
          })
        })
        delete mLine.sources
      }

      // join ssrcs in ssrc groups
      if (mLine.ssrcGroups && mLine.ssrcGroups.length) {
        mLine.ssrcGroups.forEach((ssrcGroup: any) => {
          if (typeof ssrcGroup.ssrcs !== 'undefined' && Array.isArray(ssrcGroup.ssrcs)) {
            ssrcGroup.ssrcs = ssrcGroup.ssrcs.join(' ')
          }
        })
      }
    })
  }
  //@ts-ignore
  return transform.write(session, opts)
}

/**
 * Rewrites the source information that we get from sdp-transform.
 * All the ssrc lines with different attributes that belong to the
 * same ssrc are grouped into a single soure object with multiple key value pairs.
 * @param {Object} media - media description to be modified.
 * @returns {void}
 */
const parse = function (sdp: any) {
  const session = transform.parse(sdp)

  if (
    typeof session !== 'undefined' &&
    typeof session.media !== 'undefined' &&
    Array.isArray(session.media)
  ) {
    session.media.forEach((mLine) => {
      // group sources attributes by ssrc
      if (typeof mLine.ssrcs !== 'undefined' && Array.isArray(mLine.ssrcs)) {
        //@ts-ignore
        mLine.sources = []
        mLine.ssrcs.forEach((ssrc) => {
          //@ts-ignore
          const found = mLine.sources.findIndex((source) => source.id === ssrc.id)

          if (found > -1) {
            //@ts-ignore
            mLine.sources[found][ssrc.attribute] = ssrc.value
          } else {
            const src = { id: ssrc.id }
            //@ts-ignore
            src[ssrc.attribute] = ssrc.value
            //@ts-ignore
            mLine.sources.push(src)
          }
        })
        delete mLine.ssrcs
      }

      // split ssrcs in ssrc groups
      if (typeof mLine.ssrcGroups !== 'undefined' && Array.isArray(mLine.ssrcGroups)) {
        mLine.ssrcGroups.forEach((ssrcGroup) => {
          if (typeof ssrcGroup.ssrcs === 'string') {
            //@ts-ignore
            ssrcGroup.ssrcs = ssrcGroup.ssrcs.split(' ')
          }
        })
      }
    })
  }

  return session
}

export default {
  write,
  parse
}

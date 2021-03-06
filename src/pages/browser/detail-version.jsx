import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'

import Thumbnail from '../../containers/thumbnail'
import AttributeTable from '../../containers/attributeTable'
import RepresentationDetail from './detail-representation'

import { getFamilyIcon } from '../../utils'

const VERSION_QUERY = `
    query Versions($projectName: String!, $versions: [String!]!) {
        project(name: $projectName) {
            versions(ids: $versions) {
                edges {
                    node {
                        version
                        name
                        author
                        attrib {
                          #VERSION_ATTRS#
                        }
                        subset {
                            name
                            family
                            folder {
                                name
                                parents
                            }
                        }
                        representations{
                            edges {
                                node {
                                    id
                                    name
                                    fileCount
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`

const buildVersionQuery = (attributes) => {
  let f_attribs = ''
  for (const attrib of attributes) {
    if (attrib.scope.includes('version')) f_attribs += `${attrib.name}\n`
  }
  return VERSION_QUERY.replace('#VERSION_ATTRS#', f_attribs)
}

const VersionDetail = () => {
  const context = useSelector((state) => ({ ...state.context }))
  const settings = useSelector((state) => ({ ...state.settings }))
  const projectName = context.projectName
  const [versions, setVersions] = useState([])
  const [representations, setRepresentations] = useState([])

  // Load versions and representations
  useEffect(() => {
    if (!(context.focusedVersions && context.focusedVersions.length)) {
      setVersions([])
      setRepresentations([])
      return
    }

    axios
      .post('/graphql', {
        query: buildVersionQuery(settings.attributes),
        variables: { projectName, versions: context.focusedVersions },
      })
      .then((response) => {
        const data = response.data.data
        if (!(data && data.project)) {
          console.log('ERROR', data.errors[0].message)
          return
        }

        const projectData = data.project
        let vArr = []
        let rArr = []

        for (const versionEdge of projectData.versions.edges) {
          const version = versionEdge.node
          const subset = version.subset
          const folder = subset.folder
          vArr.push({
            id: version.id,
            version: version.version,
            name: version.name,
            author: version.author,
            attrib: version.attrib,
            family: subset.family,
            subsetName: subset.name,
            folderName: folder.name,
          })
          for (const representationEdge of version.representations.edges) {
            const representation = representationEdge.node
            rArr.push({
              id: representation.id,
              name: representation.name,
              folderName: folder.name,
              subsetName: subset.name,
              family: subset.family,
              fileCount: representation.fileCount,
              // for breadcrumbs
              versionName: version.name,
              folderParents: folder.parents,
            })
          }
        }
        setVersions(vArr)
        setRepresentations(rArr)
      })

    //eslint-disable-next-line
  }, [context.projectName, context.focusedVersions, projectName])

  //
  // Render
  //

  // No version selected. do not show the detail
  if (!versions || !versions.length) return <></>

  let versionDetailWidget

  // Multiple versions selected. Show an info message
  if (versions.length > 1) {
    versionDetailWidget = (
      <section className="column">
        <span>{versions.length} versions selected</span>
      </section>
    )
  }

  // One version selected. Show the detail
  else {
    versionDetailWidget = (
      <section className="column">
        <h3>
          <span
            className="material-symbols-outlined"
            style={{ verticalAlign: 'bottom' }}
          >
            {getFamilyIcon(versions[0].family)}
          </span>
          <span style={{ marginLeft: 10 }}>
            {versions[0].subsetName} | {versions[0].name}
          </span>
        </h3>
        <Thumbnail
          projectName={projectName}
          entityType="version"
          entityId={versions[0].id}
        />
        <AttributeTable
          entityType="version"
          attribSettings={settings.attributes}
          data={versions[0].attrib}
          additionalData={[{ title: 'Author', value: versions[0].author }]}
        />
      </section>
    )
  }

  // Return Version and representation detail
  return (
    <>
      {versionDetailWidget}
      {representations && (
        <RepresentationDetail representations={representations} />
      )}
    </>
  )
}

export default VersionDetail

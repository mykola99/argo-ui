import * as classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';

import * as models from '../../../../models';
import { Duration, Tabs, Utils } from '../../../shared/components';
import { services } from '../../../shared/services';

require('./workflow-node-info.scss');

function nodeDuration(node: models.NodeStatus) {
    const endTime = node.finishedAt ? moment(node.finishedAt) : moment();
    return endTime.diff(moment(node.startedAt)) / 1000;
}

interface Props {
    node: models.NodeStatus;
    workflow: models.Workflow;
    onShowContainerLogs?: (nodeId: string, container: string) => any;
}

const AttributeRow = (attr: { title: string, value: any }) => (
    <div className='row white-box__details-row' key={attr.title}>
        <div className='columns small-3'>
            {attr.title}
        </div>
        <div className='columns small-9'>{attr.value}</div>
    </div>
);
const AttributeRows = (props: { attributes: { title: string, value: any }[] }) => (
    <div>
        {props.attributes.map((attr) => <AttributeRow key={attr.title} {...attr}/>)}
    </div>
);

export const WorkflowNodeSummary = (props: Props) => {
    const attributes = [
        {title: 'NAME', value: props.node.name},
        {title: 'TYPE', value: props.node.type},
        {title: 'PHASE', value: <span><i className={classNames('fa', Utils.statusIconClasses(props.node.phase))}  aria-hidden='true'/> {props.node.phase}</span>},
        ...(props.node.message ? [{title: 'MESSAGE', value: <span className='workflow-node-info__multi-line'>{props.node.message}</span>}] : []),
        {title: 'START TIME', value: props.node.startedAt},
        {title: 'END TIME', value: props.node.finishedAt || '-'},
        {title: 'DURATION', value: <Duration durationMs={nodeDuration(props.node)}/> },
    ];
    return (
        <div className='white-box'>
            <div className='white-box__details'>
                {<AttributeRows attributes={attributes}/>}
            </div>
        </div>
    );
};

export const WorkflowNodeInputs = (props: { inputs: models.Inputs }) => {
    const parameters = (props.inputs.parameters || []).map((artifact) => ({
        title: artifact.name,
        value: artifact.value,
    }));
    const artifacts = (props.inputs.artifacts || []).map((artifact) => ({
        title: artifact.name,
        value: artifact.path,
    }));
    return (
        <div className='white-box'>
            <div className='white-box__details'>
                {parameters.length > 0 && [
                    <div className='row white-box__details-row' key='title'>
                        <p>Parameters</p>
                    </div>,
                    <AttributeRows key='attrs' attributes={parameters}/>,
                ]}
                {artifacts.length > 0 && [
                    <div className='row white-box__details-row' key='title'>
                        <p>Artifacts</p>
                    </div>,
                    <AttributeRows key='attrs' attributes={artifacts}/>,
                ]}
            </div>
        </div>
    );
};

export const WorkflowNodeContainer = (props: { nodeId: string, container: models.Container | models.Sidecar, onShowContainerLogs: (pod: string, container: string) => any; }) => {
    const attributes = [
        {title: 'NAME', value: props.container.name || 'main'},
        {title: 'IMAGE', value: props.container.image},
        {title: 'COMMAND', value: <span className='workflow-node-info__multi-line'>{(props.container.command || []).join(' ')}</span>},
        {title: 'ARGS', value: <span className='workflow-node-info__multi-line'>{(props.container.args || []).join(' ')}</span>},
    ];
    return (
        <div className='white-box'>
            <div className='white-box__details'>
                {<AttributeRows attributes={attributes}/>}
            </div>
            <div>
                <button className='argo-button argo-button--base-o' onClick={() => props.onShowContainerLogs && props.onShowContainerLogs(props.nodeId, props.container.name)}>
                    LOGS
                </button>
            </div>
        </div>
    );
};

export class WorkflowNodeContainers extends React.Component<Props, { selectedSidecar: string }> {
    constructor(props: Props) {
        super(props);
        this.state = { selectedSidecar: null };
    }

    public render() {
        const template = this.props.workflow.spec.templates.find((item) => item.name === this.props.node.templateName);
        if (!template || !template.container) {
            return <p>Step does not have containers</p>;
        }
        const container = this.state.selectedSidecar && template.sidecars && template.sidecars.find((item) => item.name === this.state.selectedSidecar) || template.container;
        return (
            <div className='workflow-node-info__containers'>
                {this.state.selectedSidecar && <i className='fa fa-angle-left workflow-node-info__sidecar-back' onClick={() => this.setState({ selectedSidecar: null })}/>}
                <WorkflowNodeContainer nodeId={this.props.node.id} container={container} onShowContainerLogs={this.props.onShowContainerLogs}/>
                {!this.state.selectedSidecar && template.sidecars && template.sidecars.length > 0 && (
                    <div>
                        <p>SIDECARS:</p>
                        {template.sidecars.map((sidecar) => (
                            <div className='workflow-node-info__sidecar' key={sidecar.name} onClick={() => this.setState({ selectedSidecar: sidecar.name })}>
                                <span>{sidecar.name}</span> <i className='fa fa-angle-right'/>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
}

export const WorkflowNodeArtifacts = (props: Props) => {
    const artifacts = props.node.outputs && props.node.outputs.artifacts && props.node.outputs.artifacts.map((artifact) => Object.assign({}, artifact, {
        downloadUrl: services.workflows.getArtifactDownloadUrl(props.workflow, props.node.name, artifact.name),
        stepName: props.node.name,
        dateCreated: props.node.finishedAt,
        nodeName: props.node.name,
    })) || [];
    return (
        <div className='white-box'>
            {artifacts.length === 0 && (
                <div className='row'>
                    <div className='columns small-12 text-center'>No data to display</div>
                </div>
            )}
            {artifacts.map((artifact) => (
                <div className='row' key={artifact.path}>
                    <div className='columns small-1'>
                        <a href={artifact.downloadUrl}> <i className='icon argo-icon-artifact'/></a>
                    </div>
                    <div className='columns small-11'>
                        <span className='title'>{artifact.name}</span>
                        <div className='workflow-node-info__artifact-details'>
                            <span title={artifact.nodeName} className='muted'>{artifact.nodeName}</span>
                            <span title={artifact.path} className='muted'>{artifact.path}</span>
                            <span title={artifact.dateCreated.toString()} className='muted'>{artifact.dateCreated}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const WorkflowNodeInfo = (props: Props) => (
    <div className='workflow-node-info'>
        <Tabs navCenter={true} navTransparent={true} tabs={[{
            title: 'SUMMARY', key: 'summary', content: (
                <div>
                    <WorkflowNodeSummary {...props}/>
                    {props.node.inputs && <WorkflowNodeInputs inputs={props.node.inputs} />}
                </div>
            ),
        }, {
            title: 'CONTAINERS', key: 'containers', content: <WorkflowNodeContainers {...props}/>,
        }, {
            title: 'ARTIFACTS', key: 'artifacts', content: <WorkflowNodeArtifacts {...props} />,
        }]} />
    </div>
);

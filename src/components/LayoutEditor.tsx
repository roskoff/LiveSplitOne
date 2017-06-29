import * as React from "react";
import * as LiveSplit from "../livesplit";
import { ContextMenu, ContextMenuTrigger, MenuItem } from "react-contextmenu";

export interface Props { editor: LiveSplit.LayoutEditor };
export interface State {
    editor: LiveSplit.LayoutEditorStateJson,
}

export class LayoutEditor extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            editor: props.editor.stateAsJson(),
        };
    }

    update() {
        this.setState({
            ...this.state,
            editor: this.props.editor.stateAsJson(),
        });
    }

    selectComponent(i: number) {
        this.props.editor.select(i);
        this.update();
    }

    addComponent(componentClass: any) {
        this.props.editor.addComponent(componentClass.new().intoGeneric());
        this.update();
    }

    removeComponent() {
        this.props.editor.removeComponent();
        this.update();
    }

    moveComponentUp() {
        this.props.editor.moveComponentUp();
        this.update();
    }

    moveComponentDown() {
        this.props.editor.moveComponentDown();
        this.update();
    }

    render() {
        let components = this.state.editor.components.map((c, i) => {
            let className = "layout-editor-component";
            if (i == this.state.editor.selected_component) {
                className += " selected";
            }
            return (
                <tr key={i}
                    onClick={(e) => this.selectComponent(i)}
                    draggable={true}
                    onDragStart={(e) => {
                        this.props.editor.select(i);
                        this.update();
                    }}
                    onDragOver={(e) => {
                        if (e.preventDefault) {
                            e.preventDefault();
                        }
                        e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragEnd={(e) => this.update()}
                    onDrop={(e) => {
                        if (e.stopPropagation) {
                            e.stopPropagation();
                        }
                        this.props.editor.moveComponent(i);
                        return false;
                    }}
                >
                    <td className={className}>
                        {c}
                    </td>
                </tr >
            );
        });

        let contextTrigger: any = null;
        const toggleMenu = (e: any) => {
            if (contextTrigger) {
                contextTrigger.handleContextClick(e);
            }
        };

        return (
            <div className="layout-editor">
                <div className="btn-group">
                    <ContextMenuTrigger id="add-button-context-menu" ref={c => contextTrigger = c}>
                        <button onClick={toggleMenu}><i className="fa fa-plus" aria-hidden="true"></i></button>
                    </ContextMenuTrigger>
                    <ContextMenu id="add-button-context-menu">
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.CurrentComparisonComponent)}>
                            Current Comparison
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.CurrentPaceComponent)}>
                            Current Pace
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.DeltaComponent)}>
                            Delta
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.DetailedTimerComponent)}>
                            Detailed Timer
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.GraphComponent)}>
                            Graph
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.PossibleTimeSaveComponent)}>
                            Possible Time Save
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.PreviousSegmentComponent)}>
                            Previous Segment
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.SplitsComponent)}>
                            Splits
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.SumOfBestComponent)}>
                            Sum of Best
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.TextComponent)}>
                            Text
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.TimerComponent)}>
                            Timer
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.TitleComponent)}>
                            Title
                        </MenuItem>
                        <MenuItem onClick={(e) => this.addComponent(LiveSplit.TotalPlaytimeComponent)}>
                            Total Playtime
                        </MenuItem>
                    </ContextMenu>
                    <button onClick={(e) => this.removeComponent()}><i className="fa fa-minus" aria-hidden="true"></i></button>
                    <button onClick={(e) => this.moveComponentUp()}><i className="fa fa-arrow-up" aria-hidden="true"></i></button>
                    <button onClick={(e) => this.moveComponentDown()}><i className="fa fa-arrow-down" aria-hidden="true"></i></button>
                </div>
                <table className="layout-editor-component-list table">
                    <tbody className="table-body">
                        {components}
                    </tbody>
                </table>
            </div>
        );
    }
}
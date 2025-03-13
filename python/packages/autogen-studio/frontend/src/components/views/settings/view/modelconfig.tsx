import React, { useState } from "react";
import { Button, Tooltip, Drawer } from "antd";
import { Edit2, Settings } from "lucide-react";
import { truncateText } from "../../../utils";
import {
  Component,
  ComponentConfig,
  ModelConfig,
} from "../../../types/datamodel";
import { ComponentEditor } from "../../teambuilder/builder/component-editor/component-editor";

interface ModelConfigPanelProps {
  modelComponent: Component<ModelConfig>;
  onModelUpdate: (updatedModel: Component<ComponentConfig>) => Promise<void>;
}

export const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({
  modelComponent,
  onModelUpdate,
}) => {
  const [isModelEditorOpen, setIsModelEditorOpen] = useState(false);

  const handleOpenModelEditor = () => {
    setIsModelEditorOpen(true);
  };

  const handleCloseModelEditor = () => {
    setIsModelEditorOpen(false);
  };

  const handleModelUpdate = async (
    updatedModel: Component<ComponentConfig>
  ) => {
    await onModelUpdate(updatedModel);
    setIsModelEditorOpen(false);
  };

  return (
    <>
      <div className=" ">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">默认模型配置</h3>
          <div className="space-x-2 inline-flex">
            <Tooltip title="设置默认模型">
              <Button
                type="primary"
                icon={<Edit2 className="w-4 h-4 mr-1" />}
                onClick={handleOpenModelEditor}
                className="flex items-center"
              >
                编辑
              </Button>
            </Tooltip>
          </div>
        </div>

        <div className="mb-6">配置一个预设模型，用于执行系统级任务。</div>
        <div className="bg-secondary p-4 rounded">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-primary">模型</p>
              <p className="text-sm">
                {modelComponent.label || "" || "Not set"}
              </p>
              <p className="text-base">
                {modelComponent.config?.model || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary">提供商</p>
              <p className="  break-all text-sm">
                {modelComponent.provider || "Not set"}
              </p>
            </div>
            {modelComponent.config?.temperature && (
              <div>
                <p className="text-sm font-medium text-primary">温度</p>
                <p className="text-base">
                  {modelComponent.config?.temperature}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Editor Drawer */}
      <Drawer
        title="编辑默认模型配置"
        placement="right"
        size="large"
        onClose={handleCloseModelEditor}
        open={isModelEditorOpen}
        className="component-editor-drawer"
      >
        <ComponentEditor
          component={modelComponent}
          onChange={handleModelUpdate}
          onClose={handleCloseModelEditor}
          navigationDepth={true}
        />
      </Drawer>
    </>
  );
};

export default ModelConfigPanel;

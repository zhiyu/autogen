import React from "react";
import { Alert } from "antd";
import { CodeSection, copyToClipboard } from "./guides";

const DockerGuide: React.FC = () => {
  return (
    <div className="max-w-4xl">
      <h1 className="tdext-2xl font-bold mb-6">Docker 容器部署</h1>

      <Alert
        className="mb-6"
        message="先决条件"
        description={
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>您的系统已安装DOcker</li>
          </ul>
        }
        type="info"
      />
      <CodeSection
        title="1. Dockerfile"
        description=<div>
          系统提供了
          <a
            href="https://github.com/microsoft/autogen/blob/main/python/packages/autogen-studio/Dockerfile"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline px-1"
          >
            Dockerfile
          </a>
          一个 Dockerfile，您可以使用它来构建您的 Docker 容器。
        </div>
        code={`FROM mcr.microsoft.com/devcontainers/python:3.10

WORKDIR /code

RUN pip install -U gunicorn autogenstudio

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user 
    PATH=/home/user/.local/bin:$PATH 
    AUTOGENSTUDIO_APPDIR=/home/user/app

WORKDIR $HOME/app

COPY --chown=user . $HOME/app

CMD gunicorn -w $((2 * $(getconf _NPROCESSORS_ONLN) + 1)) --timeout 12600 -k uvicorn.workers.UvicornWorker autogenstudio.web.app:app --bind "0.0.0.0:8081"`}
        onCopy={copyToClipboard}
      />

      {/* Build and Run */}
      <CodeSection
        title="2. 构建并运行"
        description="构建并运行您的 Docker 容器："
        code={`docker build -t autogenstudio .
docker run -p 8000:8000 autogenstudio`}
        onCopy={copyToClipboard}
      />
    </div>
  );
};

export default DockerGuide;

#!/bin/bash

set -ex

ncu -u -x "@types/node @types/vscode junk jsondiffpatch @octokit/rest"

import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { ConfigurationsApi } from "@/api/http/groups/configurations-api.ts";

export const AppHttpApi = HttpApi.make("app").add(ConfigurationsApi);

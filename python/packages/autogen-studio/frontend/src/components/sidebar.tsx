import React from "react";
import { Link } from "gatsby";
import { useConfigStore } from "../hooks/store";
import { Tooltip } from "antd";
import {
  Settings,
  MessagesSquare,
  Blocks,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  GalleryHorizontalEnd,
  GalleryVerticalEnd,
  Rocket,
} from "lucide-react";

import {
  BellIcon,
  MoonIcon,
  SunIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

import { appContext } from "../hooks/provider";

import Icon from "./icons";

import { useTranslation } from "react-i18next";

interface INavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  breadcrumbs?: Array<{
    name: string;
    href: string;
    current?: boolean;
  }>;
}

const navigation: INavItem[] = [
  {
    name: "团队",
    href: "/build",
    icon: Bot,
    breadcrumbs: [{ name: "团队", href: "/build", current: true }],
  },
  {
    name: "会话",
    href: "/",
    icon: MessagesSquare,
    breadcrumbs: [{ name: "会话", href: "/", current: true }],
  },
  {
    name: "模板库",
    href: "/gallery",
    icon: GalleryVerticalEnd,
    breadcrumbs: [{ name: "模板库", href: "/gallery", current: true }],
  },
  {
    name: "部署",
    href: "/deploy",
    icon: Rocket,
    breadcrumbs: [{ name: "部署", href: "/deploy", current: true }],
  },
];

const classNames = (...classes: (string | undefined | boolean)[]) => {
  return classes.filter(Boolean).join(" ");
};

type SidebarProps = {
  link: string;
  meta?: {
    title: string;
    description: string;
  };
  isMobile: boolean;
};

const Sidebar = ({ link, meta, isMobile }: SidebarProps) => {
  const { sidebar, setHeader, setSidebarState } = useConfigStore();
  const { isExpanded } = sidebar;

  // Set initial header state based on current route
  React.useEffect(() => {
    setNavigationHeader(link);
  }, [link]);

  // Always show full sidebar in mobile view
  const showFull = isMobile || isExpanded;

  const handleNavClick = (item: INavItem) => {
    // if (!isExpanded) {
    //   setSidebarState({ isExpanded: true });
    // }
    setHeader({
      title: item.name,
      breadcrumbs: item.breadcrumbs,
    });
  };

  const setNavigationHeader = (path: string) => {
    const navItem = navigation.find((item) => item.href === path);
    if (navItem) {
      setHeader({
        title: navItem.name,
        breadcrumbs: navItem.breadcrumbs,
      });
    } else if (path === "/settings") {
      setHeader({
        title: "设置",
        breadcrumbs: [{ name: "设置", href: "/settings", current: true }],
      });
    }
  };

  const { darkMode, setDarkMode, user, logout } = React.useContext(appContext);

  const { t, i18n } = useTranslation();
  return (
    <div
      className={classNames(
        "flex grow z-50  flex-col gap-y-5 overflow-y-auto border-r border-secondary bg-primary",
        "transition-all duration-300 ease-in-out",
        showFull ? "w-72 px-6" : "w-16 px-2"
      )}
    >
      {/* App Logo/Title */}
      <div
        className={`flex h-16 items-center ${showFull ? "gap-x-3" : "ml-2"}`}
      >
        <Link
          to="/"
          onClick={() => setNavigationHeader("/")}
          className="w-8 text-right text-accent hover:opacity-80 transition-opacity mt-1"
        >
          <Icon icon="app" size={8} />
        </Link>
        {showFull && (
          <div
            className="flex items-center justify-between"
            style={{ minWidth: "200px" }}
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold text-primary">
                {t("appName")}
              </span>
              <span className="text-xs text-secondary">{t("appSlogan")}</span>
            </div>
            <div className="flex items-center">
              {/* Dark Mode Toggle */}
              <button
                onClick={() =>
                  setDarkMode(darkMode === "dark" ? "light" : "dark")
                }
                className="text-secondary hover:text-primary ml-2"
              >
                {darkMode === "dark" ? (
                  <MoonIcon className="h-5 w-5" />
                ) : (
                  <SunIcon className="h-5 w-5" />
                )}
              </button>

              {/* Notifications */}
              <button className="text-secondary hidden hover:text-primary">
                <BellIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          {/* Main Navigation */}
          <li>
            <ul
              role="list"
              className={classNames(
                "-mx-2 space-y-1",
                !showFull && "items-center"
              )}
            >
              {navigation.map((item) => {
                const isActive = item.href === link;
                const IconComponent = item.icon;

                const navLink = (
                  <div className="relative">
                    {isActive && (
                      <div className="bg-accent absolute top-1 left-[4px] z-50 h-8 w-[2px] bg-opacity-80  rounded"></div>
                    )}
                    <Link
                      to={item.href}
                      onClick={() => handleNavClick(item)}
                      className={classNames(
                        // Base styles
                        "group  ml-1 flex items-center gap-x-3 rounded-md mr-2  p-2 text-sm font-medium",
                        !showFull && "justify-center",
                        // Color states
                        isActive
                          ? "bg-secondary text-primary "
                          : "text-secondary hover:bg-tertiary hover:text-accent"
                      )}
                    >
                      {" "}
                      <IconComponent
                        className={classNames(
                          "h-6 w-6 shrink-0",
                          isActive
                            ? "text-accent"
                            : "text-secondary group-hover:text-accent"
                        )}
                      />
                      {showFull && item.name}
                    </Link>
                  </div>
                );

                return (
                  <li key={item.name}>
                    {!showFull && !isMobile ? (
                      <Tooltip title={item.name} placement="right">
                        {navLink}
                      </Tooltip>
                    ) : (
                      navLink
                    )}
                  </li>
                );
              })}
            </ul>
          </li>

          {/* Settings at bottom */}
          <li
            className={classNames(
              "mt-auto -mx-2 mb-4",
              !showFull && "flex flex-col items-center gap-1"
            )}
          >
            {!showFull && !isMobile ? (
              <>
                <Tooltip title="设置" placement="right">
                  <Link
                    to="/settings"
                    onClick={() =>
                      setHeader({
                        title: "设置",
                        breadcrumbs: [
                          {
                            name: "设置",
                            href: "/settings",
                            current: true,
                          },
                        ],
                      })
                    }
                    className="group   flex gap-x-3 rounded-md p-2 text-sm font-medium text-primary hover:text-accent hover:bg-secondary justify-center"
                  >
                    <Settings className="h-6 w-6 shrink-0 text-secondary group-hover:text-accent" />
                  </Link>
                </Tooltip>
                <div className="hidden md:block">
                  <Tooltip
                    title={isExpanded ? "Close Sidebar" : "Open Sidebar"}
                    placement="right"
                  >
                    <button
                      onClick={() =>
                        setSidebarState({ isExpanded: !isExpanded })
                      }
                      className="p-2 rounded-md hover:bg-secondary hover:text-accent text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50"
                    >
                      {isExpanded ? (
                        <PanelLeftClose strokeWidth={1.5} className="h-6 w-6" />
                      ) : (
                        <PanelLeftOpen strokeWidth={1.5} className="h-6 w-6" />
                      )}
                    </button>
                  </Tooltip>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-full  ">
                  <div className="">
                    {" "}
                    <Link
                      to="/settings"
                      onClick={() =>
                        setHeader({
                          title: "设置",
                          breadcrumbs: [
                            {
                              name: "设置",
                              href: "/settings",
                              current: true,
                            },
                          ],
                        })
                      }
                      className="group flex items-center flex-1 gap-x-3 rounded-md p-2 text-sm font-medium text-primary hover:text-accent hover:bg-secondary"
                    >
                      <Settings className="h-6 w-6 shrink-0 text-secondary group-hover:text-accent" />
                      {showFull && "设置"}
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block">
                  <Tooltip
                    title={`${isExpanded ? "Close Sidebar" : "Open Sidebar"}`}
                    placement="right"
                  >
                    <button
                      onClick={() =>
                        setSidebarState({ isExpanded: !isExpanded })
                      }
                      className="p-2 rounded-md hover:bg-secondary hover:text-accent text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50"
                    >
                      {isExpanded ? (
                        <PanelLeftClose strokeWidth={1.5} className="h-6 w-6" />
                      ) : (
                        <PanelLeftOpen strokeWidth={1.5} className="h-6 w-6" />
                      )}
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;

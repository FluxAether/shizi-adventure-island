import React, { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, fonts, radii } from "@/theme/tokens";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Unhandled runtime error:", error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 28, backgroundColor: colors.canvas }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.ink }}>系统小故障，请重试</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 17, color: colors.muted, textAlign: "center" }}>遇到了一点意外，点击下方按钮重试吧～</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="重新启动"
            onPress={this.handleRestart}
            style={{ minWidth: 180, minHeight: 64, borderRadius: radii.xl, alignItems: "center", justifyContent: "center", backgroundColor: colors.orange }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink }}>重新启动</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

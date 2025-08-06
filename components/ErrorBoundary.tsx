import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { RefreshCw, AlertCircle, Wifi, WifiOff, Settings } from 'lucide-react-native';
import * as Device from 'expo-device';
import { 
  isAndroidNetworkSecurityError, 
  getAndroidNetworkErrorMessage,
  showAndroidNetworkTroubleshooting,
  runNetworkDiagnostic,
  NetworkDiagnostic 
} from '@/utils/androidNetworkHelper';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRunningDiagnostic: boolean;
  diagnosticResult: NetworkDiagnostic | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRunningDiagnostic: false,
      diagnosticResult: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
      isRunningDiagnostic: false,
      diagnosticResult: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if it's the specific Android update error
    const isAndroidUpdateError = Platform.OS === 'android' && 
      (error.message?.includes('remote update request not successful') ||
       error.message?.includes('java.io.IOException') ||
       error.message?.includes('network') ||
       error.message?.includes('update'));

    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (isAndroidUpdateError) {
      console.warn('Android-specific network/update error detected - attempting recovery');
    }

    this.setState({
      error,
      errorInfo,
      hasError: true,
    });
  }

  private isNetworkError = (error: Error | null): boolean => {
    if (!error) return false;
    
    const networkErrorKeywords = [
      'network',
      'internet',
      'connection',
      'remote update request',
      'IOException',
      'fetch',
      'timeout',
      'unreachable'
    ];
    
    return networkErrorKeywords.some(keyword => 
      error.message?.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`Retrying... (${this.state.retryCount + 1}/${this.maxRetries})`);
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      console.warn('Max retries reached, manual intervention required');
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRunningDiagnostic: false,
      diagnosticResult: null,
    });
  };

  private handleRunDiagnostic = async () => {
    this.setState({ isRunningDiagnostic: true });
    
    try {
      const result = await runNetworkDiagnostic();
      this.setState({ 
        diagnosticResult: result,
        isRunningDiagnostic: false 
      });
      
      // Auto-retry if diagnostic fixed the issue
      if (result.canReachAPI && !this.state.hasError) {
        this.handleRetry();
      }
    } catch (error) {
      console.error('Diagnostic failed:', error);
      this.setState({ isRunningDiagnostic: false });
    }
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.isNetworkError(this.state.error);
      const isAndroidError = Platform.OS === 'android';
      const isAndroidNetworkSecError = isAndroidNetworkSecurityError(this.state.error || new Error());
      const canRetry = this.state.retryCount < this.maxRetries;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = isAndroidError && this.state.error 
        ? getAndroidNetworkErrorMessage(this.state.error)
        : (isNetworkError 
          ? 'Sprawdź połączenie internetowe i spróbuj ponownie.'
          : 'Aplikacja napotkała nieoczekiwany błąd.');

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            {isNetworkError ? (
              <WifiOff size={64} color="#ef4444" />
            ) : (
              <AlertCircle size={64} color="#ef4444" />
            )}
            
            <Text style={styles.title}>
              {isNetworkError ? 'Problem z połączeniem' : 'Wystąpił błąd'}
            </Text>
            
            <Text style={styles.message}>{errorMessage}</Text>

            {isAndroidError && isNetworkError && (
              <Text style={styles.androidNote}>
                📱 Android: {isAndroidNetworkSecError ? 'Problem z bezpieczeństwem sieci' : 'Sprawdź ustawienia sieci'}
              </Text>
            )}

            {/* Diagnostic Results */}
            {this.state.diagnosticResult && (
              <View style={styles.diagnosticContainer}>
                <Text style={styles.diagnosticTitle}>Status połączenia:</Text>
                <Text style={styles.diagnosticItem}>
                  🌐 Internet: {this.state.diagnosticResult.isConnected ? '✅' : '❌'}
                </Text>
                <Text style={styles.diagnosticItem}>
                  🖥️ API: {this.state.diagnosticResult.canReachAPI ? '✅' : '❌'}
                </Text>
                {this.state.diagnosticResult.cacheCleared && (
                  <Text style={styles.diagnosticItem}>🧹 Cache wyczyszczony: ✅</Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              {canRetry && !this.state.isRunningDiagnostic && (
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={this.handleRetry}
                >
                  <RefreshCw size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>
                    Spróbuj ponownie ({this.state.retryCount + 1}/{this.maxRetries})
                  </Text>
                </TouchableOpacity>
              )}

              {isAndroidError && isNetworkError && !this.state.isRunningDiagnostic && (
                <TouchableOpacity
                  style={[styles.button, styles.diagnosticButton]}
                  onPress={this.handleRunDiagnostic}
                >
                  <Wifi size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Sprawdź połączenie</Text>
                </TouchableOpacity>
              )}

              {this.state.isRunningDiagnostic && (
                <View style={[styles.button, styles.diagnosticButton, styles.loadingButton]}>
                  <RefreshCw size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Sprawdzanie...</Text>
                </View>
              )}

              {isAndroidError && !this.state.isRunningDiagnostic && (
                <TouchableOpacity
                  style={[styles.button, styles.helpButton]}
                  onPress={showAndroidNetworkTroubleshooting}
                >
                  <Settings size={20} color="#6b7280" />
                  <Text style={[styles.buttonText, styles.helpButtonText]}>
                    Pomoc techniczna
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={this.handleReset}
                disabled={this.state.isRunningDiagnostic}
              >
                <Text style={[styles.buttonText, styles.resetButtonText]}>
                  {canRetry ? 'Pomiń' : 'Zresetuj aplikację'}
                </Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && this.state.error && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>
                  Device: {Device.deviceName || 'Unknown'} ({Platform.OS})
                </Text>
                <Text style={styles.debugText}>
                  Error: {this.state.error.message}
                </Text>
                {this.state.diagnosticResult?.errorDetails && (
                  <Text style={styles.debugText}>
                    Diagnostic: {this.state.diagnosticResult.errorDetails}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  androidNote: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  resetButtonText: {
    color: '#6b7280',
  },
  debugContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  diagnosticContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    width: '100%',
  },
  diagnosticTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  diagnosticItem: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  diagnosticButton: {
    backgroundColor: '#10b981',
  },
  loadingButton: {
    opacity: 0.7,
  },
  helpButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  helpButtonText: {
    color: '#6b7280',
  },
});

export default ErrorBoundary; 